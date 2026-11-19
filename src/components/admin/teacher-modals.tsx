"use client";

import Image from "next/image";
import { useActionState, useEffect, useState, useTransition } from "react";

import { TrashIcon } from "@/components/icons";
import { ModalShell } from "@/components/ui/modal-shell";
import { teacherAvatarUrl } from "@/lib/storage-url";
import {
  addSubjectAction,
  addTeacherAction,
  removeSubjectAction,
  updateTeacherAction,
  type TeacherFormState,
} from "@/server/actions/admin-teachers";
import type { TeacherRow, TeacherSubject } from "@/server/queries/admin-teachers";

const initialState: TeacherFormState = { ok: false };

export type NoticeTone = "success" | "error";

type Course = { courseCode: string };

/* -------------------------------------------------------------------------- */
/* Add teacher                                                                */
/* -------------------------------------------------------------------------- */

export function AddTeacherModal({
  courses,
  onClose,
  onSuccess,
}: {
  courses: Course[];
  onClose: () => void;
  onSuccess: (message: string) => void;
}) {
  const [state, formAction, pending] = useActionState(addTeacherAction, initialState);

  useEffect(() => {
    if (state.ok) onSuccess(state.message ?? "Teacher added successfully!");
  }, [state.ok, state.message, onSuccess]);

  return (
    <ModalShell
      title="Add New Teacher"
      subtitle="Create an account and assign the first subject."
      onClose={onClose}
    >
      <form action={formAction} className="flex min-h-0 flex-1 flex-col">
        <div className="modal-body space-y-5">
          <AvatarField id="add_preview" label="Profile picture" action="Choose file" />

          <div>
            <label htmlFor="add_username" className="field-label">
              Username <span className="text-danger-600">*</span>
            </label>
            <input
              type="text"
              id="add_username"
              name="username"
              className="input"
              defaultValue={state.values?.username ?? ""}
              required
              autoComplete="off"
            />
          </div>

          <div>
            <label htmlFor="add_full_name" className="field-label">
              Full name <span className="text-danger-600">*</span>
            </label>
            <input
              type="text"
              id="add_full_name"
              name="full_name"
              className="input"
              defaultValue={state.values?.fullName ?? ""}
              required
              autoComplete="off"
            />
          </div>

          <div>
            <label htmlFor="add_password" className="field-label">
              Password <span className="text-danger-600">*</span>
            </label>
            <input
              type="password"
              id="add_password"
              name="password"
              className="input"
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <h3 className="mb-4 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Subject assignment
            </h3>

            <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="add_course" className="field-label">
                  Course <span className="text-danger-600">*</span>
                </label>
                <select
                  id="add_course"
                  name="course"
                  className="select"
                  defaultValue={state.values?.course ?? courses[0]?.courseCode}
                  required
                >
                  {courses.map((course) => (
                    <option key={course.courseCode} value={course.courseCode}>
                      {course.courseCode}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="add_year_level" className="field-label">
                  Year level <span className="text-danger-600">*</span>
                </label>
                <select
                  id="add_year_level"
                  name="year_level"
                  className="select"
                  defaultValue={state.values?.yearLevel ?? "1"}
                  required
                >
                  <option value="1">1st Year</option>
                  <option value="2">2nd Year</option>
                  <option value="3">3rd Year</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="add_subject_name" className="field-label">
                Subject name <span className="text-danger-600">*</span>
              </label>
              <input
                type="text"
                id="add_subject_name"
                name="subject_name"
                placeholder="e.g. Introduction to IT"
                className="input"
                defaultValue={state.values?.subjectName ?? ""}
                required
              />
            </div>
          </div>

          {state.message && !state.ok ? (
            <div className="alert alert-error" role="alert">
              <span className="flex-1">{state.message}</span>
            </div>
          ) : null}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={pending}>
            {pending ? "Adding…" : "Add Teacher"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

/* -------------------------------------------------------------------------- */
/* Edit teacher                                                               */
/* -------------------------------------------------------------------------- */

export function EditTeacherModal({
  teacher,
  onClose,
  onSuccess,
}: {
  teacher: TeacherRow;
  onClose: () => void;
  onSuccess: (message: string) => void;
}) {
  const [state, formAction, pending] = useActionState(updateTeacherAction, initialState);

  useEffect(() => {
    if (state.ok) onSuccess(state.message ?? "Teacher updated successfully!");
  }, [state.ok, state.message, onSuccess]);

  return (
    <ModalShell
      title="Edit Teacher"
      subtitle="Update account details, status or password."
      onClose={onClose}
    >
      <form action={formAction} className="flex min-h-0 flex-1 flex-col">
        <input type="hidden" name="id" value={teacher.id} />

        <div className="modal-body space-y-5">
          <AvatarField
            id="edit_preview"
            label="Profile picture"
            action="Change photo"
            existingUrl={teacherAvatarUrl(teacher.profileImage)}
            fallback={teacher.fullName.charAt(0).toUpperCase()}
          />

          <div>
            <label htmlFor="edit_username" className="field-label">
              Username <span className="text-danger-600">*</span>
            </label>
            <input
              type="text"
              id="edit_username"
              name="username"
              className="input"
              defaultValue={state.values?.username ?? teacher.username}
              required
              autoComplete="off"
            />
          </div>

          <div>
            <label htmlFor="edit_full_name" className="field-label">
              Full name <span className="text-danger-600">*</span>
            </label>
            <input
              type="text"
              id="edit_full_name"
              name="full_name"
              className="input"
              defaultValue={state.values?.fullName ?? teacher.fullName}
              required
              autoComplete="off"
            />
          </div>

          <div>
            <label htmlFor="edit_status" className="field-label">
              Status <span className="text-danger-600">*</span>
            </label>
            <select
              id="edit_status"
              name="status"
              className="select"
              defaultValue={state.values?.status ?? teacher.status}
              required
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div>
            <label htmlFor="edit_password" className="field-label">
              New password{" "}
              <span className="font-normal text-slate-400">
                (leave blank to keep current)
              </span>
            </label>
            <input
              type="password"
              id="edit_password"
              name="password"
              className="input"
              placeholder="Enter new password (optional)"
              autoComplete="new-password"
            />
          </div>

          {state.message && !state.ok ? (
            <div className="alert alert-error" role="alert">
              <span className="flex-1">{state.message}</span>
            </div>
          ) : null}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={pending}>
            {pending ? "Updating…" : "Update Teacher"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

/* -------------------------------------------------------------------------- */
/* Manage subjects                                                            */
/* -------------------------------------------------------------------------- */

export function SubjectsModal({
  teacher,
  courses,
  onClose,
  onNotify,
}: {
  teacher: TeacherRow;
  courses: Course[];
  onClose: () => void;
  onNotify: (tone: NoticeTone, message: string) => void;
}) {
  const [subjects, setSubjects] = useState<TeacherSubject[]>(teacher.subjects);
  const [formError, setFormError] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [pending, startAction] = useTransition();
  const [removing, startRemoving] = useTransition();

  function handleAdd(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startAction(async () => {
      const result = await addSubjectAction(formData);
      if (!result.ok) {
        setFormError(result.message ?? "Failed to add subject.");
        return;
      }

      setFormError(null);
      if (result.subjects) setSubjects(result.subjects);
      onNotify("success", result.message ?? "Subject added successfully!");
      setFormKey((current) => current + 1);
    });
  }

  function handleRemove(subject: TeacherSubject) {
    if (
      !window.confirm(
        `Remove "${subject.label}" from this teacher's assigned subjects?`,
      )
    ) {
      return;
    }

    startRemoving(async () => {
      const result = await removeSubjectAction(subject.id);
      if (!result.ok) {
        onNotify("error", result.message ?? "Failed to remove subject.");
        return;
      }
      if (result.subjects) setSubjects(result.subjects);
      onNotify("success", result.message ?? "Subject removed successfully!");
    });
  }

  return (
    <ModalShell
      title="Manage Subjects"
      subtitle={`Management for ${teacher.fullName}`}
      onClose={onClose}
    >
      <div className="modal-body">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50/70">
          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-100/60 px-4 py-2.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Assigned subjects
            </span>
            <span className="badge badge-neutral">{subjects.length}</span>
          </div>

          <div className="max-h-[200px] divide-y divide-slate-100 overflow-y-auto bg-white">
            {subjects.length === 0 ? (
              <div className="p-4 text-center text-sm italic text-slate-400">
                No subjects assigned yet
              </div>
            ) : (
              subjects.map((subject) => (
                <div
                  key={subject.id}
                  className="group/item flex items-center justify-between p-3 transition-colors hover:bg-white"
                >
                  <span className="text-sm font-medium text-slate-700">
                    {subject.label}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemove(subject)}
                    disabled={removing}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-all hover:bg-danger-50 hover:text-danger-600 disabled:opacity-40"
                    title="Delete Subject"
                    aria-label={`Remove ${subject.label}`}
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <form
          key={formKey}
          id="addSubjectForm"
          onSubmit={handleAdd}
          className="mt-6 space-y-4 border-t border-slate-100 pt-6"
        >
          <input type="hidden" name="teacher_id" value={teacher.teacherId} />

          <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Add new subject
          </h3>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="subj_course" className="field-label">
                Course <span className="text-danger-600">*</span>
              </label>
              <select
                id="subj_course"
                name="course"
                className="select"
                defaultValue={courses[0]?.courseCode}
                required
              >
                {courses.map((course) => (
                  <option key={course.courseCode} value={course.courseCode}>
                    {course.courseCode}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="subj_year_level" className="field-label">
                Year <span className="text-danger-600">*</span>
              </label>
              <select
                id="subj_year_level"
                name="year_level"
                className="select"
                defaultValue="1"
                required
              >
                <option value="1">1st</option>
                <option value="2">2nd</option>
                <option value="3">3rd</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="subj_subject_name" className="field-label">
              Subject name <span className="text-danger-600">*</span>
            </label>
            <input
              type="text"
              id="subj_subject_name"
              name="subject_name"
              placeholder="e.g. Introduction to IT"
              className="input"
              required
            />
          </div>

          {formError ? (
            <div className="alert alert-error" role="alert">
              <span className="flex-1">{formError}</span>
            </div>
          ) : null}
        </form>
      </div>

      <div className="modal-footer">
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          Close
        </button>
        <button
          type="submit"
          form="addSubjectForm"
          className="btn btn-primary"
          disabled={pending || removing}
        >
          {pending ? "Adding…" : "Add Subject"}
        </button>
      </div>
    </ModalShell>
  );
}

/* -------------------------------------------------------------------------- */
/* Shared avatar field                                                        */
/* -------------------------------------------------------------------------- */

function AvatarField({
  id,
  label,
  action,
  existingUrl,
  fallback,
}: {
  id: string;
  label: string;
  action: string;
  existingUrl?: string | null;
  fallback?: string;
}) {
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!preview) return;
    return () => URL.revokeObjectURL(preview);
  }, [preview]);

  const src = preview ?? existingUrl ?? null;

  return (
    <div>
      <span className="field-label">{label}</span>
      <div className="flex items-center gap-4">
        <div
          id={id}
          className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-slate-300 bg-slate-50"
        >
          {src ? (
            <Image
              src={src}
              alt=""
              width={80}
              height={80}
              className="h-full w-full object-cover"
              unoptimized={src.startsWith("blob:")}
            />
          ) : fallback ? (
            <span className="text-xl font-bold text-slate-400">{fallback}</span>
          ) : (
            <span className="px-1 text-center text-xs text-slate-400">No Image</span>
          )}
        </div>
        <label className="btn btn-secondary btn-sm cursor-pointer">
          {action}
          <input
            type="file"
            name="profile_image"
            className="sr-only"
            accept="image/*"
            onChange={(event) => {
              const file = event.target.files?.[0];
              setPreview(file ? URL.createObjectURL(file) : null);
            }}
          />
        </label>
      </div>
    </div>
  );
}
