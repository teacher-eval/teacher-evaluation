import type { Metadata } from "next";

import { TeachersScreen } from "@/components/admin/teachers-screen";
import { requireRole } from "@/lib/rbac";
import { getTeacherList } from "@/server/queries/admin-teachers";
import { getCourseOptions } from "@/server/queries/courses";

export const metadata: Metadata = { title: "Manage Teachers" };
export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  page?: string | string[];
  search?: string | string[];
}>;

export default async function AdminTeachersPage({
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
    getTeacherList({
      page: Number.isFinite(requestedPage) ? requestedPage : 1,
      search,
    }),
    getCourseOptions(),
  ]);

  return (
    <TeachersScreen
      rows={list.rows}
      courses={courses.map((course) => ({ courseCode: course.courseCode }))}
      page={list.page}
      totalPages={list.totalPages}
      totalRecords={list.totalRecords}
      search={list.search}
    />
  );
}
