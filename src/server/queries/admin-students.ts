import type { Prisma } from "@/generated/prisma/client";
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
