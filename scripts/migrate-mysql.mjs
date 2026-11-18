#!/usr/bin/env node
/**
 * Copies the legacy MySQL database into Supabase Postgres.
 *
 *   node scripts/migrate-mysql.mjs --dry-run   # validate + report, write nothing
 *   node scripts/migrate-mysql.mjs --reset     # truncate target tables, then copy
 *
 * Design notes:
 * - IDs are preserved so links in bookmarks and reports stay stable.
 * - MySQL is read with `dateStrings` and its session timezone pinned to +08:00
 *   (Asia/Manila, no DST). Postgres runs SET TIME ZONE 'Asia/Manila', so the
 *   wall-clock timestamps land in TIMESTAMPTZ without shifting.
 * - Pre-flight checks fail loudly on data that the new schema forbids: duplicate
 *   daily evaluations, duplicate student/teacher rows per user, unknown enum
 *   values. Resolve those rows in MySQL first; nothing is written until the
 *   checks pass.
 * - The script never creates schema. Run `npx prisma migrate deploy` first.
 */

import mysql from "mysql2/promise";
import pg from "pg";
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local", quiet: true });
loadEnv({ path: ".env", quiet: true });

const argv = new Set(process.argv.slice(2));
const DRY_RUN = argv.has("--dry-run");
const RESET = argv.has("--reset");

const TABLES = [
  "users",
  "courses",
  "teachers",
  "students",
  "subjects",
  "evaluation_settings",
  "evaluation_questions",
  "user_2fa",
  "reactions",
];

const INSERT_ORDER = TABLES;

/** Columns copied per table, in insert order. */
const COLUMNS = {
  users: ["id", "username", "password", "full_name", "role", "status", "created_at", "updated_at"],
  courses: ["id", "course_code", "course_name", "created_at", "updated_at"],
  teachers: ["id", "user_id", "department", "status", "created_at", "updated_at", "profile_image"],
  students: ["id", "user_id", "course", "year_level", "status", "created_at", "updated_at"],
  subjects: [
    "id",
    "subject_name",
    "course",
    "year_level",
    "teacher_id",
    "status",
    "created_at",
    "updated_at",
  ],
  evaluation_settings: [
    "id",
    "academic_year",
    "semester",
    "start_date",
    "end_date",
    "is_active",
    "created_at",
  ],
  evaluation_questions: [
    "id",
    "question_no",
    "question_text",
    "is_active",
    "sort_order",
    "created_at",
    "updated_at",
  ],
  user_2fa: ["id", "user_id", "is_enabled", "method", "totp_secret", "email", "created_at", "updated_at"],
  reactions: [
    "id",
    "stud_id",
    "teacherid",
    "subject",
    "q1",
    "q2",
    "q3",
    "q4",
    "q5",
    "q6",
    "q7",
    "q8",
    "q9",
    "q10",
    "feels",
    "comments",
    "date",
    "created_at",
  ],
};

const VALID = {
  role: ["admin", "teacher", "student"],
  status: ["active", "inactive"],
  method: ["totp", "email"],
  feels: [
    "outstanding",
    "very satisfactory",
    "satisfactory",
    "needs improvements",
    "poor",
  ],
};

/** tinyint(1) columns that map to Postgres boolean. */
const BOOLEAN_COLUMNS = new Set(["is_active", "is_enabled"]);

function env(name, fallback) {
  const value = process.env[name];
  if (value === undefined || value === "") {
    if (fallback === undefined) throw new Error(`Missing ${name}`);
    return fallback;
  }
  return value;
}

function line(title) {
  console.log(`\n=== ${title} ${"=".repeat(Math.max(0, 60 - title.length))}`);
}

function quoteIdent(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function chunks(items, size) {
  const output = [];
  for (let i = 0; i < items.length; i += size) output.push(items.slice(i, i + size));
  return output;
}

function normaliseRow(row) {
  const out = {};
  for (const [key, value] of Object.entries(row)) {
    if (BOOLEAN_COLUMNS.has(key)) {
      out[key] = value === true || value === 1 || value === "1";
    } else if (value instanceof Date) {
      out[key] = Number.isNaN(value.getTime()) ? null : value.toISOString();
    } else {
      out[key] = value;
    }
  }
  return out;
}

async function main() {
  const mysqlConfig = {
    host: env("MYSQL_HOST", "localhost"),
    port: Number(env("MYSQL_PORT", "3306")),
    user: env("MYSQL_USER", "root"),
    password: env("MYSQL_PASSWORD", ""),
    database: env("MYSQL_DATABASE", "evaluation"),
    dateStrings: true,
    supportBigNumbers: true,
  };

  // Direct/session connection for bulk inserts: the transaction pooler in
  // DATABASE_URL is fine too, but DIRECT_URL avoids pgbouncer limits.
  const pgUrl = process.env.DIRECT_URL?.trim() || process.env.DATABASE_URL?.trim();
  if (!pgUrl) {
    throw new Error("Missing DIRECT_URL or DATABASE_URL — see .env.example.");
  }
  const pgConfig = { connectionString: pgUrl };

  line("Connecting");
  const my = await mysql.createConnection(mysqlConfig);
  await my.query("SET time_zone = '+08:00'");
  console.log(`MySQL   ${mysqlConfig.host}:${mysqlConfig.port}/${mysqlConfig.database}`);

  const client = new pg.Client(pgConfig);
  await client.connect();
  await client.query("SET TIME ZONE 'Asia/Manila'");
  console.log(`Postgres ${new URL(pgUrl).host}`);

  try {
    const data = await readSource(my);
    await preflight(my, data);

    if (DRY_RUN) {
      line("Dry run complete");
      console.log("No rows were written. Re-run without --dry-run to migrate.");
      return;
    }

    await writeTarget(client, data);
    await verify(client, data);
  } finally {
    await my.end().catch(() => {});
    await client.end().catch(() => {});
  }
}

async function readSource(my) {
  line("Reading MySQL");
  const data = {};

  for (const table of TABLES) {
    const cols = COLUMNS[table];
    const [rows] = await my.query(
      `SELECT ${cols.map((c) => `\`${c}\``).join(", ")} FROM \`${table}\``,
    );
    data[table] = rows.map(normaliseRow);
    console.log(`${table.padEnd(24)} ${String(rows.length).padStart(7)} rows`);
  }

  return data;
}

async function preflight(my, data) {
  line("Pre-flight checks");
  const problems = [];

  for (const [index, row] of data.users.entries()) {
    if (!VALID.role.includes(row.role)) {
      problems.push(`users[${index}] id=${row.id}: unknown role "${row.role}"`);
    }
  }

  for (const table of ["teachers", "students", "subjects"]) {
    for (const row of data[table]) {
      if (!VALID.status.includes(row.status)) {
        problems.push(`${table} id=${row.id}: unknown status "${row.status}"`);
      }
    }
  }

  for (const row of data.user_2fa) {
    if (!VALID.method.includes(row.method)) {
      problems.push(`user_2fa id=${row.id}: unknown method "${row.method}"`);
    }
  }

  for (const row of data.reactions) {
    if (!VALID.feels.includes(row.feels)) {
      problems.push(`reactions id=${row.id}: unknown feels "${row.feels}"`);
    }
  }

  // Duplicates are looked for in the *source*: the target starts empty, so a
  // check there would always pass and the unique index would then reject the
  // insert halfway through the copy.
  const duplicates = await findDuplicates(
    my,
    "reactions",
    ["stud_id", "teacherid", "subject", "date"],
  );
  for (const row of duplicates) {
    problems.push(
      `reactions duplicate (stud_id=${row.stud_id}, teacherid=${row.teacherid}, subject="${row.subject}", date=${row.date}) x${row.count}`,
    );
  }

  const duplicateStudents = await findDuplicates(my, "students", ["user_id"]);
  for (const row of duplicateStudents) {
    problems.push(`students duplicate user_id=${row.user_id} x${row.count}`);
  }

  const duplicateTeachers = await findDuplicates(my, "teachers", ["user_id"]);
  for (const row of duplicateTeachers) {
    problems.push(`teachers duplicate user_id=${row.user_id} x${row.count}`);
  }

  if (problems.length > 0) {
    console.error("\nThe target schema is stricter than the source data:");
    for (const problem of problems.slice(0, 50)) console.error(`  - ${problem}`);
    if (problems.length > 50) console.error(`  ... and ${problems.length - 50} more`);
    throw new Error("Resolve the rows above, then run the migration again.");
  }

  console.log("No blocking data problems found.");
}

/**
 * Finds groups of rows that the stricter Postgres indexes would reject.
 *
 * Table and column names come from the fixed allow-lists above, never from user
 * input. MySQL connections return `[rows, fields]`, unlike `pg`.
 */
async function findDuplicates(my, table, columns) {
  const groupBy = columns.map((column) => `\`${column}\``).join(", ");
  const [rows] = await my.query(
    `SELECT ${groupBy}, COUNT(*) AS count
       FROM \`${table}\`
      GROUP BY ${groupBy}
     HAVING COUNT(*) > 1
      LIMIT 50`,
  );
  return rows;
}

async function writeTarget(client, data) {
  line("Writing Postgres");

  await client.query("BEGIN");
  try {
    if (RESET) {
      // Children first, then parents.
      const order = [...INSERT_ORDER].reverse();
      for (const table of order) {
        await client.query(`TRUNCATE TABLE ${quoteIdent(table)} CASCADE`);
      }
      console.log("Target tables truncated (--reset).");
    } else {
      const { rows } = await client.query(
        `SELECT COUNT(*)::int AS count FROM ${quoteIdent("users")}`,
      );
      if (rows[0].count > 0) {
        throw new Error(
          "Target already contains users. Re-run with --reset to overwrite, or use a fresh database.",
        );
      }
    }

    for (const table of INSERT_ORDER) {
      const rows = data[table];
      if (!rows.length) {
        console.log(`${table.padEnd(24)}      0 rows`);
        continue;
      }

      for (const chunk of chunks(rows, 500)) {
        const values = [];
        const tuples = chunk.map((row) => {
          const placeholders = COLUMNS[table].map((column) => {
            values.push(row[column] ?? null);
            return `$${values.length}`;
          });
          return `(${placeholders.join(", ")})`;
        });

        await client.query(
          `INSERT INTO ${quoteIdent(table)} (${COLUMNS[table]
            .map(quoteIdent)
            .join(", ")}) VALUES ${tuples.join(", ")}`,
          values,
        );
      }

      console.log(`${table.padEnd(24)} ${String(rows.length).padStart(7)} rows`);
    }

    // SERIAL sequences do not advance on explicit-id inserts.
    for (const table of INSERT_ORDER) {
      await client.query(
        `SELECT setval(
           pg_get_serial_sequence($1, 'id'),
           COALESCE((SELECT MAX(id) FROM ${quoteIdent(table)}), 1),
           true
         )`,
        [table],
      );
    }

    await client.query("COMMIT");
    console.log("Committed.");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  }
}

async function verify(client, data) {
  line("Verifying");

  let ok = true;
  for (const table of TABLES) {
    const { rows } = await client.query(
      `SELECT COUNT(*)::int AS count FROM ${quoteIdent(table)}`,
    );
    const actual = rows[0].count;
    const expected = data[table].length;
    const match = actual === expected;
    ok &&= match;
    console.log(
      `${match ? "ok  " : "FAIL"} ${table.padEnd(24)} source=${expected} target=${actual}`,
    );
  }

  const { rows: evalRows } = await client.query(
    `SELECT COUNT(*)::int AS count,
            COALESCE(SUM(q1 + q2 + q3 + q4 + q5 + q6 + q7 + q8 + q9 + q10), 0)::bigint AS total
       FROM reactions`,
  );
  const expectedTotal = data.reactions.reduce(
    (sum, row) =>
      sum +
      ["q1", "q2", "q3", "q4", "q5", "q6", "q7", "q8", "q9", "q10"].reduce(
        (inner, key) => inner + Number(row[key] ?? 0),
        0,
      ),
    0,
  );
  const ratingsMatch = Number(evalRows[0].total) === expectedTotal;
  ok &&= ratingsMatch;
  console.log(
    `${ratingsMatch ? "ok  " : "FAIL"} reaction rating totals   source=${expectedTotal} target=${evalRows[0].total}`,
  );

  if (!ok) {
    throw new Error("Verification failed — restore the previous database before switching traffic.");
  }

  line("Done");
  console.log("Data migration complete. Next: copy teacher avatars to Supabase Storage.");
}

main().catch((error) => {
  console.error(`\nMigration failed: ${error.message}`);
  process.exitCode = 1;
});
