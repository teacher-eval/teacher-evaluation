import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";

/**
 * Aggregation for the teacher dashboard, rewritten from
 * getTeacherDashboardData() in backend/controllers/TeacherController.php.
 *
 * The legacy code builds a dynamic SELECT against reactions so it can return
 * one AVG(NULLIF(qN, 0)) per active question in a single round trip. Prisma's
 * typed aggregate cannot exclude zero values per column, so the same SQL is
 * issued through $queryRaw. Question numbers come from evaluation_questions
 * and are constrained to 1..10 before they are inlined, which keeps the
 * fragment safe.
 */

export type TeacherCriterion = {
  no: number;
  label: string;
  avg: number | null;
};

export type RatingBucket = {
  label: string;
  rating: number;
  count: number;
};

export type TeacherDashboardData = {
  teacherId: number;
  department: string;
  profileImage: string | null;
  availableSubjects: string[];
  /** The raw `?subject=` value, shown even when it does not match a subject. */
  selectedSubject: string | null;
  subjectsEvaluated: number;
  totalEvaluations: number;
  averageRating: number | null;
  allTimeRating: number | null;
  criteria: TeacherCriterion[];
  distribution: RatingBucket[];
};

type StatsRow = {
  total_evaluations: number;
  average_rating: number | null;
  count_poor: number;
  count_needs_improvements: number;
  count_satisfactory: number;
  count_very_satisfactory: number;
  count_outstanding: number;
  [key: `avg_q${number}`]: number | null;
};

/** Same order the PHP $ratingScale array used, best first. */
const RATING_SCALE = [
  { label: "Excellence", rating: 5, key: "count_outstanding" },
  { label: "Good", rating: 4, key: "count_very_satisfactory" },
  { label: "Fair", rating: 3, key: "count_satisfactory" },
  { label: "Poor", rating: 2, key: "count_needs_improvements" },
  { label: "Very Poor", rating: 1, key: "count_poor" },
] as const;

const FEELS_TO_SCORE = `
  CASE
    WHEN "feels" = 'outstanding' THEN 5
    WHEN "feels" = 'very satisfactory' THEN 4
    WHEN "feels" = 'satisfactory' THEN 3
    WHEN "feels" = 'needs improvements' THEN 2
    WHEN "feels" = 'poor' THEN 1
    ELSE NULL
  END`;

export async function getTeacherDashboard(
  userId: number,
  subjectFilter: string | null,
): Promise<TeacherDashboardData | null> {
  const teacher = await prisma.teacher.findUnique({
    where: { userId },
    select: { id: true, department: true, profileImage: true },
  });

  if (!teacher) return null;

  const questions = await prisma.evaluationQuestion.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { questionNo: "asc" }],
    select: { questionNo: true, questionText: true },
  });

  const subjects = await prisma.reaction.findMany({
    where: { teacherId: teacher.id },
    distinct: ["subject"],
    orderBy: { subject: "asc" },
    select: { subject: true },
  });
  const availableSubjects = subjects.map((row) => row.subject);

  // The filter only applies when it names a subject that actually has data;
  // the raw value is still used for headings, exactly as the PHP page did.
  const appliedFilter =
    subjectFilter && availableSubjects.includes(subjectFilter) ? subjectFilter : null;

  const stats = await aggregate(teacher.id, appliedFilter, questions);

  const allTimeRating = appliedFilter
    ? await overallAverage(teacher.id)
    : stats.average_rating;

  return {
    teacherId: teacher.id,
    department: teacher.department?.trim() ?? "",
    profileImage: teacher.profileImage,
    availableSubjects,
    selectedSubject: subjectFilter,
    subjectsEvaluated: availableSubjects.length,
    totalEvaluations: stats.total_evaluations,
    averageRating: stats.average_rating,
    allTimeRating,
    criteria: questions.map((question) => ({
      no: question.questionNo,
      label: question.questionText,
      avg: stats[`avg_q${question.questionNo}`] ?? null,
    })),
    distribution: RATING_SCALE.map((bucket) => ({
      label: bucket.label,
      rating: bucket.rating,
      count: stats[bucket.key],
    })),
  };
}

async function aggregate(
  teacherId: number,
  subject: string | null,
  questions: { questionNo: number }[],
): Promise<StatsRow> {
  const avgColumns = questions
    .filter((question) => question.questionNo >= 1 && question.questionNo <= 10)
    .map(
      (question) =>
        `AVG(NULLIF("q${question.questionNo}", 0))::float8 AS "avg_q${question.questionNo}"`,
    );

  const avgSql = avgColumns.length > 0 ? `, ${avgColumns.join(", ")}` : "";

  const rows = await prisma.$queryRaw<StatsRow[]>(Prisma.sql`
    SELECT
      COUNT(*)::int AS "total_evaluations",
      AVG(NULLIF(${Prisma.raw(FEELS_TO_SCORE)}, 0))::float8 AS "average_rating"${Prisma.raw(avgSql)},
      SUM(CASE WHEN "feels" = 'poor' THEN 1 ELSE 0 END)::int AS "count_poor",
      SUM(CASE WHEN "feels" = 'needs improvements' THEN 1 ELSE 0 END)::int AS "count_needs_improvements",
      SUM(CASE WHEN "feels" = 'satisfactory' THEN 1 ELSE 0 END)::int AS "count_satisfactory",
      SUM(CASE WHEN "feels" = 'very satisfactory' THEN 1 ELSE 0 END)::int AS "count_very_satisfactory",
      SUM(CASE WHEN "feels" = 'outstanding' THEN 1 ELSE 0 END)::int AS "count_outstanding"
    FROM "reactions"
    WHERE "teacherid" = ${teacherId}
    ${subject ? Prisma.sql`AND "subject" = ${subject}` : Prisma.empty}
  `);

  return rows[0];
}

async function overallAverage(teacherId: number): Promise<number | null> {
  const rows = await prisma.$queryRaw<{ overall_avg: number | null }[]>(Prisma.sql`
    SELECT AVG(NULLIF(${Prisma.raw(FEELS_TO_SCORE)}, 0))::float8 AS "overall_avg"
    FROM "reactions"
    WHERE "teacherid" = ${teacherId}
  `);

  return rows[0]?.overall_avg ?? null;
}
