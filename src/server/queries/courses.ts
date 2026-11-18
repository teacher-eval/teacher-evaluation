import { prisma } from "@/lib/db";

/**
 * Course list for the admin dropdowns, from getCourses() in
 * backend/controllers/AdminController.php (`ORDER BY course_code`).
 */
export type CourseOption = {
  courseCode: string;
  courseName: string;
};

export async function getCourseOptions(): Promise<CourseOption[]> {
  return prisma.course.findMany({
    orderBy: { courseCode: "asc" },
    select: { courseCode: true, courseName: true },
  });
}
