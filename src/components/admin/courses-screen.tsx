"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import { AddCourseModal, EditCourseModal } from "@/components/admin/course-modals";
import { PageHeader } from "@/components/layout/app-shell";
import { ListPagination } from "@/components/layout/list-pagination";
import { CloseIcon, NavIcon, PlusIcon, TrashIcon } from "@/components/icons";
import { formatShortDate } from "@/lib/dates";
import { deleteCourseAction } from "@/server/actions/admin-courses";
import type { CourseRecord } from "@/server/queries/admin-courses";

type Notice = { tone: "success" | "error"; message: string };

type ModalState = { type: "add" } | { type: "edit"; course: CourseRecord } | null;

export function CoursesScreen({
  rows,
  page,
  totalPages,
  totalRecords,
  search,
}: {
  rows: CourseRecord[];
  page: number;
  totalPages: number;
  totalRecords: number;
  search: string;
}) {
  const router = useRouter();
  const [modal, setModal] = useState<ModalState>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [searchValue, setSearchValue] = useState(search);
  const [pending, startTransition] = useTransition();
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const closeModal = useCallback(() => setModal(null), []);

  const handleFormSuccess = useCallback(
    (message: string) => {
      setModal(null);
      setNotice({ tone: "success", message });
      router.refresh();
    },
    [router],
  );

  useEffect(() => {
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, []);

  function navigate(term: string) {
    const params = new URLSearchParams();
    const trimmed = term.trim();
    if (trimmed) params.set("search", trimmed);
    const query = params.toString();
    router.push(`/admin/courses${query ? `?${query}` : ""}`);
  }

  // The legacy input submitted itself 500 ms after typing stopped.
  function handleSearchChange(value: string) {
    setSearchValue(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => navigate(value), 500);
  }

  function submitSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (searchTimer.current) clearTimeout(searchTimer.current);
    navigate(searchValue);
  }

  function handleDelete(course: CourseRecord) {
    const ok = window.confirm(
      `Delete ${course.courseCode}? This may affect existing students/teachers linked to this course code.`,
    );
    if (!ok) return;

    startTransition(async () => {
      const result = await deleteCourseAction(course.id);
      setNotice({ tone: result.ok ? "success" : "error", message: result.message });
      if (result.ok) router.refresh();
    });
  }

  return (
    <>
      <PageHeader
        title="Manage Courses"
        subtitle="Add, edit, and manage courses for students and teachers."
        actions={
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setModal({ type: "add" })}
          >
            <PlusIcon className="h-5 w-5" />
            Add Course
          </button>
        }
      />

      <div className="mb-6">
        <form onSubmit={submitSearch} className="group relative max-w-md" role="search">
          <input
            type="text"
            name="search"
            value={searchValue}
            onChange={(event) => handleSearchChange(event.target.value)}
            placeholder="Search courses…"
            autoComplete="off"
            aria-label="Search courses"
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
              href="/admin/courses"
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
              Courses, including course code, name and creation date
            </caption>
            <thead>
              <tr>
                <th scope="col">Course Code</th>
                <th scope="col">Course Name</th>
                <th scope="col">Created At</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={4}>
                    <div className="empty-state" role="status">
                      <div className="empty-state-icon">
                        <NavIcon name="courses" className="h-7 w-7" />
                      </div>
                      <p className="empty-state-title">No courses found</p>
                      <p className="empty-state-text">
                        Add a course to start linking students and teachers to it.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                rows.map((course) => (
                  <tr key={course.id}>
                    <td className="cell-primary">{course.courseCode}</td>
                    <td className="font-medium text-slate-600">{course.courseName}</td>
                    <td className="cell-muted">{formatShortDate(course.createdAt)}</td>
                    <td>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          className="icon-btn h-9 w-9"
                          onClick={() => setModal({ type: "edit", course })}
                          title="Edit course"
                          aria-label={`Edit ${course.courseCode}`}
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
                          onClick={() => handleDelete(course)}
                          disabled={pending}
                          title="Delete course"
                          aria-label={`Delete ${course.courseCode}`}
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
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

      {modal?.type === "add" ? (
        <AddCourseModal onClose={closeModal} onSuccess={handleFormSuccess} />
      ) : null}

      {modal?.type === "edit" ? (
        <EditCourseModal
          course={modal.course}
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
  return `/admin/courses${query ? `?${query}` : ""}`;
}
