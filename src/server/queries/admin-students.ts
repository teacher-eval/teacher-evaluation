import type { Prisma } from "@/generated/prisma/client";
import { formatDate, isoDateOnly, todayIso } from "@/lib/dates";
import { prisma } from "@/lib/db";

/** Matches the $limit = 5 in handleStudentActions(). */
export const STUDENTS_PER_PAGE = 5;

export type StudentRow = {
  /** users.id — what the legacy forms post as `id`. */
  id: number;
  username: string;
  fullName: string;
  course: string;
  yearLevel: number;
  /** True once an admin rolled a 3rd-year student over into graduation. */
  graduated: boolean;
  /** users.status, which is a free-form string rather than the students enum. */
  status: string;
};

export type StudentList = {
  rows: StudentRow[];
  page: number;
  totalPages: number;
  totalRecords: number;
  search: string;
};

export async function getStudentList({
  page: requestedPage,
  search,
}: {
  page: number;
  search: string;
}): Promise<StudentList> {
  const where: Prisma.UserWhereInput = {
    role: "student",
    // The legacy list used an INNER JOIN students, so orphaned user rows are out.
    student: { isNot: null },
    ...(search
      ? {
          OR: [
            { fullName: { contains: search, mode: "insensitive" } },
            { username: { contains: search, mode: "insensitive" } },
            {
              student: {
                is: { course: { contains: search, mode: "insensitive" } },
              },
            },
          ],
        }
      : {}),
  };

  const [totalRecords, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { fullName: "asc" },
      skip: Math.max(0, (requestedPage - 1) * STUDENTS_PER_PAGE),
      take: STUDENTS_PER_PAGE,
      select: {
        id: true,
        username: true,
        fullName: true,
        status: true,
        student: {
          select: { course: true, yearLevel: true, graduatedAt: true },
        },
      },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalRecords / STUDENTS_PER_PAGE));
  const page = Math.min(Math.max(1, requestedPage), totalPages);

  return {
    rows: users.map((user) => ({
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      course: user.student!.course,
      yearLevel: user.student!.yearLevel,
      graduated: user.student!.graduatedAt !== null,
      status: user.status,
    })),
    page,
    totalPages,
    totalRecords,
    search,
  };
}

/* ------------------------------------------------------------------ promotion */

const ACADEMIC_YEAR_PATTERN = /^\d{4}-\d{4}$/;

export type PromotionCandidate = {
  /** students.id — what the promotion form posts. */
  id: number;
  fullName: string;
  username: string;
  course: string;
  yearLevel: number;
  /** `null` means the student is in the final year and will graduate. */
  nextLevel: number | null;
  registeredAt: string;
  registeredLabel: string;
  lastPromotedAcademicYear: string | null;
};

export type PromotionPreview = {
  /** Configured academic years plus the next one, ascending. */
  academicYears: string[];
  defaultAcademicYear: string;
  /** AY → start date (YYYY-MM-DD), for spotting students who just registered. */
  periodStartDates: Record<string, string>;
  candidates: PromotionCandidate[];
};

export function nextAcademicYear(academicYear: string): string {
  const start = Number.parseInt(academicYear.slice(0, 4), 10);
  if (!Number.isFinite(start)) return academicYear;
  return `${start + 1}-${start + 2}`;
}

/** School-year label for "today", used when no evaluation period is configured. */
function currentAcademicYear(now: Date): string {
  const iso = todayIso(now);
  const year = Number.parseInt(iso.slice(0, 4), 10);
  const month = Number.parseInt(iso.slice(5, 7), 10);
  return month >= 6 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
}

/**
 * Data for the admin rollover dialog. Deliberately reads only `students` and
 * `evaluation_settings` — no enrollment records exist in this app. Year level
 * is a single number that the admin bumps, and `lastPromotedAcademicYear`
 * keeps a second run for the same year from bumping anyone twice.
 */
export async function getPromotionPreview(now: Date = new Date()): Promise<PromotionPreview> {
  const [settings, students] = await Promise.all([
    prisma.evaluationSetting.findMany({
      select: { academicYear: true, startDate: true },
      orderBy: { startDate: "asc" },
    }),
    prisma.student.findMany({
      where: {
        status: "active",
        graduatedAt: null,
        user: { status: "active" },
      },
      select: {
        id: true,
        course: true,
        yearLevel: true,
        lastPromotedAcademicYear: true,
        createdAt: true,
        user: { select: { fullName: true, username: true } },
      },
      orderBy: [
        { course: "asc" },
        { yearLevel: "asc" },
        { user: { fullName: "asc" } },
      ],
    }),
  ]);

  const configured = [
    ...new Set(
      settings
        .map((setting) => setting.academicYear)
        .filter((year) => ACADEMIC_YEAR_PATTERN.test(year)),
    ),
  ].sort();

  const latest = configured[configured.length - 1] ?? currentAcademicYear(now);
  const academicYears = [...new Set([...configured, latest, nextAcademicYear(latest)])].sort();

  const periodStartDates: Record<string, string> = {};
  for (const setting of settings) {
    if (!ACADEMIC_YEAR_PATTERN.test(setting.academicYear)) continue;
    if (setting.academicYear in periodStartDates) continue;
    periodStartDates[setting.academicYear] = isoDateOnly(setting.startDate);
  }

  const candidates: PromotionCandidate[] = students.map((student) => ({
    id: student.id,
    fullName: student.user.fullName,
    username: student.user.username,
    course: student.course,
    yearLevel: student.yearLevel,
    nextLevel: student.yearLevel >= 3 ? null : student.yearLevel + 1,
    registeredAt: isoDateOnly(student.createdAt),
    registeredLabel: formatDate(student.createdAt),
    lastPromotedAcademicYear: student.lastPromotedAcademicYear,
  }));

  // If everyone has already been rolled into the latest year, default to the
  // following one so a repeat visit does not look like a no-op.
  // With no configured period there is nothing current to roll into, so the
  // sensible starting point is the upcoming year.
  let defaultAcademicYear =
    configured.length > 0 ? latest : nextAcademicYear(latest);
  const allRolledOver =
    candidates.length > 0 &&
    candidates.every(
      (candidate) =>
        candidate.lastPromotedAcademicYear !== null &&
        candidate.lastPromotedAcademicYear >= defaultAcademicYear,
    );
  if (allRolledOver) {
    defaultAcademicYear = nextAcademicYear(latest);
  }

  return { academicYears, defaultAcademicYear, periodStartDates, candidates };
}
