import type { Metadata } from "next";

import { CoursesScreen } from "@/components/admin/courses-screen";
import { requireRole } from "@/lib/rbac";
import { getCourseList } from "@/server/queries/admin-courses";

export const metadata: Metadata = { title: "Manage Courses" };
export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  page?: string | string[];
  search?: string | string[];
}>;

export default async function AdminCoursesPage({
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

  const list = await getCourseList({
    page: Number.isFinite(requestedPage) ? requestedPage : 1,
    search,
  });

  return (
    <CoursesScreen
      rows={list.rows}
      page={list.page}
      totalPages={list.totalPages}
      totalRecords={list.totalRecords}
      search={list.search}
    />
  );
}
