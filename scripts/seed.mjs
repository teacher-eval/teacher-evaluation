#!/usr/bin/env node
/**
 * Bootstraps a fresh deployment.
 *
 *   node scripts/seed.mjs            # idempotent: only creates what is missing
 *   node scripts/seed.mjs --reset-password
 *
 * Creates:
 *   - the four TVET courses, if the table is empty
 *   - the seven default evaluation questions, if the table is empty
 *   - one administrator account
 *   - an open evaluation period (only when no period exists yet)
 *
 * The admin password comes from SEED_ADMIN_PASSWORD. When that is not set a
 * random one is generated and printed once — it is never stored in the repo.
 *
 * Uses `pg` directly rather than Prisma: the generated client is TypeScript and
 * this script must run before a build.
 */

import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import pg from "pg";
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local", quiet: true });
loadEnv({ path: ".env", quiet: true });

const RESET_PASSWORD = process.argv.includes("--reset-password");

const COURSES = [
  ["DIT", "Diploma in Information Technology"],
  ["DIST", "Diploma in Information Systems Technology"],
  ["DSOT", "Diploma in Systems Operations Technology"],
  ["DBOT", "Diploma in Business Operations Technology"],
];

const QUESTIONS = [
  "Subject matter knowledge",
  "Practical application of skills in teaching",
  "Use of teaching aids/tools",
  "Student engagement and interaction",
  "Timeliness and preparation",
  "Assessment and feedback to students",
  "Professional behavior and attitude",
];

const connectionString =
  process.env.DIRECT_URL?.trim() || process.env.DATABASE_URL?.trim();

if (!connectionString) {
  console.error("Missing DIRECT_URL or DATABASE_URL — see .env.example.");
  process.exit(1);
}

function line(title) {
  console.log(`\n=== ${title} ${"=".repeat(Math.max(0, 58 - title.length))}`);
}

async function main() {
  const client = new pg.Client({ connectionString });
  await client.connect();
  await client.query("SET TIME ZONE 'Asia/Manila'");

  try {
    await seedCourses(client);
    await seedQuestions(client);
    const created = await seedAdmin(client);
    await seedEvaluationPeriod(client);

    line("Done");
    if (created) {
      console.log(`Administrator "${created.username}" created.`);
      console.log(`Password: ${created.password}`);
      console.log("Store it in a password manager and change it after first sign-in.");
    } else {
      console.log("Nothing to do — the database already has an administrator.");
    }
  } finally {
    await client.end().catch(() => {});
  }
}

async function seedCourses(client) {
  line("Courses");
  const { rows } = await client.query("SELECT COUNT(*)::int AS count FROM courses");
  if (rows[0].count > 0) {
    console.log("Already populated, skipping.");
    return;
  }

  for (const [code, name] of COURSES) {
    await client.query(
      `INSERT INTO courses (course_code, course_name)
       VALUES ($1, $2)
       ON CONFLICT (course_code) DO NOTHING`,
      [code, name],
    );
  }
  console.log(`Inserted ${COURSES.length} courses.`);
}

async function seedQuestions(client) {
  line("Evaluation questions");
  const { rows } = await client.query(
    "SELECT COUNT(*)::int AS count FROM evaluation_questions",
  );
  if (rows[0].count > 0) {
    console.log("Already populated, skipping.");
    return;
  }

  for (const [index, text] of QUESTIONS.entries()) {
    await client.query(
      `INSERT INTO evaluation_questions (question_no, question_text, sort_order)
       VALUES ($1, $2, $1)`,
      [index + 1, text],
    );
  }
  console.log(`Inserted ${QUESTIONS.length} questions.`);
}

async function seedAdmin(client) {
  line("Administrator");

  const username = process.env.SEED_ADMIN_USERNAME?.trim() || "admin";

  const { rows: existing } = await client.query(
    "SELECT id, status FROM users WHERE username = $1",
    [username],
  );

  if (existing.length > 0) {
    if (!RESET_PASSWORD) {
      console.log(`User "${username}" exists, leaving it untouched.`);
      return null;
    }

    const password =
      process.env.SEED_ADMIN_PASSWORD?.trim() || randomBytes(12).toString("base64url");
    await client.query(
      "UPDATE users SET password = $2, role = 'admin', status = 'active', updated_at = now() WHERE id = $1",
      [existing[0].id, await bcrypt.hash(password, 12)],
    );
    console.log(`Password reset for "${username}".`);
    return { username, password };
  }

  const password =
    process.env.SEED_ADMIN_PASSWORD?.trim() || randomBytes(12).toString("base64url");
  const fullName = process.env.SEED_ADMIN_FULL_NAME?.trim() || "System Administrator";

  await client.query(
    `INSERT INTO users (username, password, full_name, role, status)
     VALUES ($1, $2, $3, 'admin', 'active')`,
    [username, await bcrypt.hash(password, 12), fullName],
  );

  return { username, password };
}

async function seedEvaluationPeriod(client) {
  line("Evaluation period");
  const { rows } = await client.query(
    "SELECT COUNT(*)::int AS count FROM evaluation_settings",
  );
  if (rows[0].count > 0) {
    console.log("A period already exists, skipping.");
    return;
  }

  // Open now so a fresh install can be exercised immediately. The admin edits
  // the real dates under Evaluation Settings.
  await client.query(
    `INSERT INTO evaluation_settings (academic_year, semester, start_date, end_date, is_active)
     VALUES (
       $1,
       '1st',
       (now() AT TIME ZONE 'Asia/Manila')::date - 7,
       (now() AT TIME ZONE 'Asia/Manila')::date + 30,
       true
     )`,
    [academicYear()],
  );
  console.log("Created an open evaluation period (today -7d .. +30d).");
}

/** Philippine school year label: June–March rolls over, e.g. "2025-2026". */
function academicYear() {
  const now = new Date();
  const manila = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Manila" }),
  );
  const year = manila.getMonth() >= 5 ? manila.getFullYear() : manila.getFullYear() - 1;
  return `${year}-${year + 1}`;
}

main().catch((error) => {
  console.error(`\nSeed failed: ${error.message}`);
  process.exitCode = 1;
});
