import type { Metadata } from "next";

import { StudentsScreen } from "@/components/admin/students-screen";
import { requireRole } from "@/lib/rbac";
import { getStudentList } from "@/server/queries/admin-students";
import { getCourseOptions } from "@/server/queries/courses";

export const metadata: Metadata = { title: "Manage Students" };
export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  page?: string | string[];
  search?: string | string[];
}>;

export default async function AdminStudentsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireRole("admin");

  const params = await searchParams;
  const requestedPage = Number.parseInt(
    typeof params.page === "string" ? params.page : "1",
    10,
  );
  const search = (typeof params.search === "string" ? params.search : "").trim();

  const [list, courses] = await Promise.all([
    getStudentList({
      page: Number.isFinite(requestedPage) ? requestedPage : 1,
      search,
    }),
    getCourseOptions(),
  ]);

  return (
    <StudentsScreen
      rows={list.rows}
      courses={courses.map((course) => ({ courseCode: course.courseCode }))}
      page={list.page}
      totalPages={list.totalPages}
      totalRecords={list.totalRecords}
      search={list.search}
    />
  );
}
