import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";

/** Matches the $limit = 10 in handleCourseActions(). */
export const COURSES_PER_PAGE = 10;

export type CourseRecord = {
  id: number;
  courseCode: string;
  courseName: string;
  createdAt: Date;
};

export type CourseList = {
  rows: CourseRecord[];
  page: number;
  totalPages: number;
  totalRecords: number;
  search: string;
};

export async function getCourseList({
  page: requestedPage,
  search,
}: {
  page: number;
  search: string;
}): Promise<CourseList> {
  const where: Prisma.CourseWhereInput = search
    ? {
        OR: [
          { courseName: { contains: search, mode: "insensitive" } },
          { courseCode: { contains: search, mode: "insensitive" } },
        ],
      }
    : {};

  const [totalRecords, rows] = await Promise.all([
    prisma.course.count({ where }),
    prisma.course.findMany({
      where,
      orderBy: { courseCode: "asc" },
      skip: Math.max(0, (requestedPage - 1) * COURSES_PER_PAGE),
      take: COURSES_PER_PAGE,
      select: { id: true, courseCode: true, courseName: true, createdAt: true },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalRecords / COURSES_PER_PAGE));
  const page = Math.min(Math.max(1, requestedPage), totalPages);

  return { rows, page, totalPages, totalRecords, search };
}
