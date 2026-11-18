"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";

import { EditStudentModal } from "@/components/admin/student-modals";
import { PageHeader } from "@/components/layout/app-shell";
import { ListPagination } from "@/components/layout/list-pagination";
import { CloseIcon, TrashIcon } from "@/components/icons";
import { statusBadge } from "@/lib/status";
import { deleteStudentAction } from "@/server/actions/admin-students";
import type { StudentRow } from "@/server/queries/admin-students";

type Course = { courseCode: string };

type Notice = { tone: "success" | "error"; message: string };

export function StudentsScreen({
  rows,
  courses,
  page,
  totalPages,
  totalRecords,
  search,
}: {
  rows: StudentRow[];
  courses: Course[];
  page: number;
  totalPages: number;
  totalRecords: number;
  search: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<StudentRow | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [searchValue, setSearchValue] = useState(search);
  const [pending, startTransition] = useTransition();

  const closeModal = useCallback(() => setEditing(null), []);

  const handleFormSuccess = useCallback(
    (message: string) => {
      setEditing(null);
      setNotice({ tone: "success", message });
      router.refresh();
    },
    [router],
  );

  function submitSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams();
    const term = searchValue.trim();
    if (term) params.set("search", term);
    const query = params.toString();
    router.push(`/admin/students${query ? `?${query}` : ""}`);
  }

  function handleDelete(student: StudentRow) {
    const ok = window.confirm(
      `Are you sure you want to delete this student? This also removes ${student.fullName}'s evaluation records.`,
    );
    if (!ok) return;

    startTransition(async () => {
      const result = await deleteStudentAction(student.id);
      setNotice({ tone: result.ok ? "success" : "error", message: result.message });
      if (result.ok) router.refresh();
    });
  }

  return (
    <>
      <PageHeader
        title="Manage Students"
        subtitle="Edit and manage student accounts. Students register through the registration page."
      />

      <div className="mb-6">
        <form onSubmit={submitSearch} className="group relative max-w-md" role="search">
          <input
            type="text"
            name="search"
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder="Search name, username or course…"
            autoComplete="off"
            aria-label="Search students"
            className="input pl-10 pr-10"
          />
          <span className="input-icon left-3.5 transition-colors group-focus-within:text-navy">
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </span>
          {search ? (
            <Link
              href="/admin/students"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600"
              title="Clear search"
              aria-label="Clear search"
            >
              <CloseIcon className="h-5 w-5" />
            </Link>
          ) : null}
        </form>
      </div>

      {notice ? (
        <div
          className={`alert ${
            notice.tone === "success" ? "alert-success" : "alert-error"
          } mb-6`}
          role="alert"
        >
          <span className="flex-1">{notice.message}</span>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className={
              notice.tone === "success"
                ? "text-success-600 hover:text-success-700"
                : "text-danger-600 hover:text-danger-700"
            }
            aria-label="Dismiss message"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>
      ) : null}

      <div className="table-shell">
        <div className="overflow-x-auto">
          <table className="data-table">
            <caption className="sr-only">
              Student accounts, including username, full name, course, year level and
              status
            </caption>
            <thead>
              <tr>
                <th scope="col">Username</th>
                <th scope="col">Full Name</th>
                <th scope="col">Course</th>
                <th scope="col" className="text-center">
                  Year Level
                </th>
                <th scope="col" className="text-center">
                  Status
                </th>
                <th scope="col" className="text-center">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((student) => {
                const badge = statusBadge(student.status);

                return (
                  <tr key={student.id}>
                    <td
                      className="max-w-[150px] truncate text-slate-600"
                      title={student.username}
                    >
                      {student.username}
                    </td>
                    <td
                      className="cell-primary max-w-[200px] truncate"
                      title={student.fullName}
                    >
                      {student.fullName}
                    </td>
                    <td className="font-medium text-slate-600">{student.course}</td>
                    <td className="text-center text-slate-600">{student.yearLevel}</td>
                    <td className="text-center">
                      <span className={badge.className}>{badge.label}</span>
                    </td>
                    <td className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          className="icon-btn h-9 w-9"
                          onClick={() => setEditing(student)}
                          title="Edit student"
                          aria-label={`Edit ${student.fullName}`}
                        >
                          <svg
                            className="h-5 w-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                          </svg>
                        </button>
                        <button
                          type="button"
                          className="icon-btn icon-btn-danger h-9 w-9"
                          onClick={() => handleDelete(student)}
                          disabled={pending}
                          title="Delete student"
                          aria-label={`Delete ${student.fullName}`}
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <ListPagination
        page={page}
        totalPages={totalPages}
        totalRecords={totalRecords}
        hrefFor={(target) => pageHref(target, search)}
      />

      {editing ? (
        <EditStudentModal
          student={editing}
          courses={courses}
          onClose={closeModal}
          onSuccess={handleFormSuccess}
        />
      ) : null}
    </>
  );
}

function pageHref(page: number, search: string): string {
  const params = new URLSearchParams();
  if (page > 1) params.set("page", String(page));
  if (search) params.set("search", search);
  const query = params.toString();
  return `/admin/students${query ? `?${query}` : ""}`;
}
