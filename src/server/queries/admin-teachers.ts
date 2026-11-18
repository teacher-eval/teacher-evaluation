import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";

/** Matches the $limit = 5 in handleTeacherActions(). */
export const TEACHERS_PER_PAGE = 5;

export type TeacherSubject = {
  id: number;
  label: string;
};

export type TeacherRow = {
  /** users.id — what the legacy forms post as `id`. */
  id: number;
  /** teachers.id — what subject forms post as `teacher_id`. */
  teacherId: number;
  username: string;
  fullName: string;
  status: string;
  profileImage: string | null;
  subjects: TeacherSubject[];
};

export type TeacherList = {
  rows: TeacherRow[];
  page: number;
  totalPages: number;
  totalRecords: number;
  search: string;
};

export async function getTeacherList({
  page: requestedPage,
  search,
}: {
  page: number;
  search: string;
}): Promise<TeacherList> {
  const where: Prisma.UserWhereInput = {
    role: "teacher",
    // The legacy list used INNER JOIN teachers, so orphaned user rows are out.
    teacher: { isNot: null },
    ...(search
      ? {
          OR: [
            { fullName: { contains: search, mode: "insensitive" } },
            { username: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const totalRecords = await prisma.user.count({ where });
  const totalPages = Math.max(1, Math.ceil(totalRecords / TEACHERS_PER_PAGE));
  const page = Math.min(Math.max(1, requestedPage), totalPages);

  const users = await prisma.user.findMany({
    where,
    orderBy: { fullName: "asc" },
    skip: (page - 1) * TEACHERS_PER_PAGE,
    take: TEACHERS_PER_PAGE,
    select: {
      id: true,
      username: true,
      fullName: true,
      status: true,
      teacher: {
        select: {
          id: true,
          profileImage: true,
          subjects: {
            select: {
              id: true,
              subjectName: true,
              course: true,
              yearLevel: true,
            },
            orderBy: [{ subjectName: "asc" }, { id: "asc" }],
          },
        },
      },
    },
  });

  return {
    rows: users.map((user) => ({
      id: user.id,
      teacherId: user.teacher!.id,
      username: user.username,
      fullName: user.fullName,
      status: user.status,
      profileImage: user.teacher!.profileImage,
      subjects: user.teacher!.subjects.map((subject) => ({
        id: subject.id,
        label: `${subject.subjectName} - ${subject.course} (Yr ${subject.yearLevel})`,
      })),
    })),
    page,
    totalPages,
    totalRecords,
    search,
  };
}
