import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { isoDateOnly, semesterLabel, todayIso } from "@/lib/dates";

/**
 * Evaluation report data, rewritten from getReportPeriods() and
 * getAdminReportsData() in backend/controllers/AdminController.php.
 *
 * Reactions carry no period id, so a period scopes the report by date: the
 * LEFT JOIN is filtered on `r.date` exactly like the PHP query. Active
 * teachers with no evaluations still appear in the table, with dashes in place
 * of the numbers.
 */

export type ReportPeriodStatus = "Active" | "Upcoming" | "Ended";

export type ReportPeriod = {
  id: number;
  academicYear: string;
  semester: string;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  status: ReportPeriodStatus;
  statusClass: string;
};

export type ReportRow = {
  teacherName: string;
  totalEvaluations: number;
  averageRating: number | null;
  /** Counts for ratings 1 (Poor) through 5 (Outstanding). */
  ratings: [number, number, number, number, number];
};

export type TeacherChartRow = {
  teacherName: string;
  totalEvaluations: number;
  averageRating: number;
};

export type AdminReportsData = {
  rows: ReportRow[];
  topTeachers: TeacherChartRow[];
  bottomTeachers: TeacherChartRow[];
  /** Totals per rating, indexed 0 → rating 1. */
  ratingDistribution: [number, number, number, number, number];
};

/** Human-readable semester label ("1st Semester", "Summer"). */
export { semesterLabel };

export function periodLabel(period: ReportPeriod): string {
  return `AY ${period.academicYear} · ${semesterLabel(period.semester)}`;
}

/** Same status derivation the PHP page performs from the dates alone. */
export async function getReportPeriods(now: Date = new Date()): Promise<ReportPeriod[]> {
  const rows = await prisma.evaluationSetting.findMany({
    select: {
      id: true,
      academicYear: true,
      semester: true,
      startDate: true,
      endDate: true,
      isActive: true,
    },
    orderBy: [{ startDate: "desc" }, { id: "desc" }],
  });

  const today = todayIso(now);

  return rows.map((row) => {
    const start = isoDateOnly(row.startDate);
    const end = isoDateOnly(row.endDate);

    if (end < today) {
      return { ...row, status: "Ended", statusClass: "bg-slate-100 text-slate-600" };
    }
    if (start > today) {
      return { ...row, status: "Upcoming", statusClass: "bg-amber-100 text-amber-800" };
    }
    return { ...row, status: "Active", statusClass: "bg-emerald-100 text-emerald-800" };
  });
}

/**
 * Resolves `?period=` the way the PHP page did: the requested id when it
 * exists, otherwise the running period, otherwise the most recent one.
 */
export function selectPeriod(
  periods: ReportPeriod[],
  requestedId: number,
): ReportPeriod | null {
  const requested = periods.find((period) => period.id === requestedId);
  if (requested) return requested;

  const active = periods.find((period) => period.status === "Active");
  return active ?? periods[0] ?? null;
}

type SummarySqlRow = {
  teacherName: string;
  totalEvaluations: number;
  averageRating: number | null;
  rating1: number;
  rating2: number;
  rating3: number;
  rating4: number;
  rating5: number;
};

const FEELS_TO_SCORE = `
  CASE
    WHEN r."feels" = 'outstanding' THEN 5
    WHEN r."feels" = 'very satisfactory' THEN 4
    WHEN r."feels" = 'satisfactory' THEN 3
    WHEN r."feels" = 'needs improvements' THEN 2
    WHEN r."feels" = 'poor' THEN 1
    ELSE NULL
  END`;

export async function getAdminReportsData(
  range: { start: Date; end: Date } | null,
): Promise<AdminReportsData> {
  const rangeJoin =
    range === null
      ? Prisma.empty
      : Prisma.sql`AND r."date" BETWEEN ${isoDateOnly(range.start)}::date AND ${isoDateOnly(range.end)}::date`;

  const rows = await prisma.$queryRaw<SummarySqlRow[]>(Prisma.sql`
    SELECT
      u."full_name" AS "teacherName",
      COUNT(r."id")::int AS "totalEvaluations",
      AVG(${Prisma.raw(FEELS_TO_SCORE)})::float8 AS "averageRating",
      COALESCE(SUM(CASE WHEN r."feels" = 'poor' THEN 1 ELSE 0 END), 0)::int AS "rating1",
      COALESCE(SUM(CASE WHEN r."feels" = 'needs improvements' THEN 1 ELSE 0 END), 0)::int AS "rating2",
      COALESCE(SUM(CASE WHEN r."feels" = 'satisfactory' THEN 1 ELSE 0 END), 0)::int AS "rating3",
      COALESCE(SUM(CASE WHEN r."feels" = 'very satisfactory' THEN 1 ELSE 0 END), 0)::int AS "rating4",
      COALESCE(SUM(CASE WHEN r."feels" = 'outstanding' THEN 1 ELSE 0 END), 0)::int AS "rating5"
    FROM "teachers" t
    INNER JOIN "users" u ON t."user_id" = u."id"
    LEFT JOIN "reactions" r ON t."id" = r."teacherid" ${rangeJoin}
    WHERE t."status" = 'active'
    GROUP BY t."id", u."full_name"
    ORDER BY "averageRating" DESC NULLS LAST, "totalEvaluations" DESC
  `);

  const reportRows: ReportRow[] = rows.map((row) => ({
    teacherName: row.teacherName,
    totalEvaluations: row.totalEvaluations,
    averageRating: row.averageRating,
    ratings: [row.rating1, row.rating2, row.rating3, row.rating4, row.rating5],
  }));

  // Only teachers rated within the selected period belong in the charts.
  const rated: TeacherChartRow[] = rows
    .filter((row) => row.totalEvaluations > 0 && row.averageRating !== null)
    .map((row) => ({
      teacherName: row.teacherName,
      totalEvaluations: row.totalEvaluations,
      averageRating: row.averageRating as number,
    }));

  const bottom = [...rated].sort((a, b) => {
    if (a.averageRating === b.averageRating) {
      return a.totalEvaluations - b.totalEvaluations;
    }
    return a.averageRating - b.averageRating;
  });

  const ratingDistribution = rows.reduce<[number, number, number, number, number]>(
    (totals, row) => {
      totals[0] += row.rating1;
      totals[1] += row.rating2;
      totals[2] += row.rating3;
      totals[3] += row.rating4;
      totals[4] += row.rating5;
      return totals;
    },
    [0, 0, 0, 0, 0],
  );

  return {
    rows: reportRows,
    topTeachers: rated.slice(0, 5),
    bottomTeachers: bottom.slice(0, 5),
    ratingDistribution,
  };
}

/** `AY2024-2025_1st` style slug used by the export filename. */
export function reportFileSlug(period: ReportPeriod | null): string {
  if (!period) return "All";
  const sanitize = (value: string) => value.replace(/[^0-9A-Za-z]+/g, "-");
  return `AY${sanitize(period.academicYear)}_${sanitize(period.semester)}`;
}
