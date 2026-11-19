"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";

import {
  AddTeacherModal,
  EditTeacherModal,
  SubjectsModal,
  type NoticeTone,
} from "@/components/admin/teacher-modals";
import { PageHeader } from "@/components/layout/app-shell";
import { ListPagination } from "@/components/layout/list-pagination";
import { CloseIcon, PlusIcon } from "@/components/icons";
import { statusBadge } from "@/lib/status";
import { teacherAvatarUrl } from "@/lib/storage-url";
import { deleteTeacherAction, removeSubjectAction } from "@/server/actions/admin-teachers";
import type { TeacherRow, TeacherSubject } from "@/server/queries/admin-teachers";

type Course = { courseCode: string };

type ModalState =
  | { type: "add" }
  | { type: "edit"; teacher: TeacherRow }
  | { type: "subjects"; teacher: TeacherRow }
  | null;

type Notice = { tone: NoticeTone; message: string };

export function TeachersScreen({
  rows,
  courses,
  page,
  totalPages,
  totalRecords,
  search,
}: {
  rows: TeacherRow[];
  courses: Course[];
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

  const closeModal = useCallback(() => setModal(null), []);

  const notify = useCallback(
    (tone: NoticeTone, message: string) => {
      setNotice({ tone, message });
      if (tone === "success") router.refresh();
    },
    [router],
  );

  const handleFormSuccess = useCallback(
    (message: string) => {
      setModal(null);
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
    router.push(`/admin/teachers${query ? `?${query}` : ""}`);
  }

  function handleDeleteTeacher(teacher: TeacherRow) {
    const ok = window.confirm(
      `Are you sure you want to delete ${teacher.fullName}? This also removes their assigned subjects and evaluation records.`,
    );
    if (!ok) return;

    startTransition(async () => {
      const result = await deleteTeacherAction(teacher.id);
      setNotice({ tone: result.ok ? "success" : "error", message: result.message });
      if (result.ok) router.refresh();
    });
  }

  function handleRemoveSubject(subject: TeacherSubject) {
    const ok = window.confirm(
      `Remove "${subject.label}" from this teacher's assigned subjects?`,
    );
    if (!ok) return;

    startTransition(async () => {
      const result = await removeSubjectAction(subject.id);
      setNotice({
        tone: result.ok ? "success" : "error",
        message: result.message ?? "Failed to remove subject.",
      });
      if (result.ok) router.refresh();
    });
  }

  return (
    <>
      <PageHeader
        title="Manage Teachers"
        subtitle="Add, edit, and manage teacher accounts and subject assignments."
        actions={
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setModal({ type: "add" })}
          >
            <PlusIcon className="h-5 w-5" />
            Add Teacher
          </button>
        }
      />

      <div className="mb-6">
        <form
          onSubmit={submitSearch}
          className="group relative max-w-md"
          role="search"
        >
          <input
            type="text"
            name="search"
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder="Search name or username."
            autoComplete="off"
            aria-label="Search teachers"
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
              href="/admin/teachers"
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
          className={`alert ${notice.tone === "success" ? "alert-success" : "alert-error"} mb-6`}
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
              Teacher accounts, including username, full name, assigned subjects and
              status
            </caption>
            <thead>
              <tr>
                <th scope="col" className="w-16">
                  Photo
                </th>
                <th scope="col">Username</th>
                <th scope="col">Full Name</th>
                <th scope="col">Subjects</th>
                <th scope="col">Status</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((teacher) => {
                const badge = statusBadge(teacher.status);
                const avatarUrl = teacherAvatarUrl(teacher.profileImage);

                return (
                  <tr key={teacher.id}>
                    <td>
                      {avatarUrl ? (
                        <Image
                          src={avatarUrl}
                          alt=""
                          width={40}
                          height={40}
                          className="h-10 w-10 rounded-full border-2 border-slate-200 object-cover shadow-sm"
                        />
                      ) : (
                        <div
                          className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-slate-200 bg-slate-100 font-bold text-slate-500"
                          aria-hidden="true"
                        >
                          {teacher.fullName.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </td>
                    <td className="text-slate-600">{teacher.username}</td>
                    <td className="cell-primary">{teacher.fullName}</td>
                    <td>
                      <div className="flex max-w-xs flex-wrap gap-1">
                        {teacher.subjects.length === 0 ? (
                          <span className="text-xs italic text-slate-400">
                            No subjects
                          </span>
                        ) : (
                          teacher.subjects.map((subject) => (
                            <span key={subject.id} className="badge badge-info pr-1">
                              <span className="max-w-[150px] truncate">
                                {subject.label}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleRemoveSubject(subject)}
                                disabled={pending}
                                className="ml-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full text-info-700/70 transition-colors hover:bg-danger-50 hover:text-danger-600 disabled:opacity-40"
                                title="Remove subject"
                                aria-label={`Remove ${subject.label}`}
                              >
                                <CloseIcon className="h-3 w-3" />
                              </button>
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                    <td>
                      <span className={badge.className}>{badge.label}</span>
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          className="icon-btn h-9 w-9"
                          onClick={() => setModal({ type: "subjects", teacher })}
                          title="Manage subjects"
                          aria-label={`Manage subjects for ${teacher.fullName}`}
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
                              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                            />
                          </svg>
                        </button>
                        <button
                          type="button"
                          className="icon-btn h-9 w-9"
                          onClick={() => setModal({ type: "edit", teacher })}
                          title="Edit teacher"
                          aria-label={`Edit ${teacher.fullName}`}
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
                          onClick={() => handleDeleteTeacher(teacher)}
                          disabled={pending}
                          title="Delete teacher"
                          aria-label={`Delete ${teacher.fullName}`}
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
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
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
      {modal?.type === "add" ? (
        <AddTeacherModal
          courses={courses}
          onClose={closeModal}
          onSuccess={handleFormSuccess}
        />
      ) : null}

      {modal?.type === "edit" ? (
        <EditTeacherModal
          teacher={modal.teacher}
          onClose={closeModal}
          onSuccess={handleFormSuccess}
        />
      ) : null}

      {modal?.type === "subjects" ? (
        <SubjectsModal
          teacher={modal.teacher}
          courses={courses}
          onClose={closeModal}
          onNotify={notify}
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
  return `/admin/teachers${query ? `?${query}` : ""}`;
}
