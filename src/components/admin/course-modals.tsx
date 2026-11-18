"use client";

import { useActionState, useEffect } from "react";

import { ModalShell } from "@/components/ui/modal-shell";
import {
  addCourseAction,
  updateCourseAction,
  type CourseFormState,
} from "@/server/actions/admin-courses";
import type { CourseRecord } from "@/server/queries/admin-courses";

const initialState: CourseFormState = { ok: false };

export function AddCourseModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: (message: string) => void;
}) {
  const [state, formAction, pending] = useActionState(addCourseAction, initialState);

  useEffect(() => {
    if (state.ok) onSuccess(state.message ?? "Course added successfully!");
  }, [state.ok, state.message, onSuccess]);

  return (
    <ModalShell
      title="Add New Course"
      subtitle="Create a course code for students and teachers."
      size="md"
      onClose={onClose}
    >
      <form action={formAction} className="flex min-h-0 flex-1 flex-col">
        <div className="modal-body space-y-5">
          <div>
            <label htmlFor="add_course_code" className="field-label">
              Course code <span className="text-danger-600">*</span>
            </label>
            <input
              type="text"
              id="add_course_code"
              name="course_code"
              placeholder="e.g. DIT"
              className="input uppercase"
              defaultValue={state.values?.courseCode ?? ""}
              required
              autoComplete="off"
            />
          </div>

          <div>
            <label htmlFor="add_course_name" className="field-label">
              Course name <span className="text-danger-600">*</span>
            </label>
            <input
              type="text"
              id="add_course_name"
              name="course_name"
              placeholder="e.g. Diploma in Information Technology"
              className="input"
              defaultValue={state.values?.courseName ?? ""}
              required
              autoComplete="off"
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
            {pending ? "Adding…" : "Add Course"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

export function EditCourseModal({
  course,
  onClose,
  onSuccess,
}: {
  course: CourseRecord;
  onClose: () => void;
  onSuccess: (message: string) => void;
}) {
  const [state, formAction, pending] = useActionState(updateCourseAction, initialState);

  useEffect(() => {
    if (state.ok) onSuccess(state.message ?? "Course updated successfully!");
  }, [state.ok, state.message, onSuccess]);

  return (
    <ModalShell
      title="Edit Course"
      subtitle="Update the course code or name."
      size="md"
      onClose={onClose}
    >
      <form action={formAction} className="flex min-h-0 flex-1 flex-col">
        <input type="hidden" name="id" value={course.id} />

        <div className="modal-body space-y-5">
          <div>
            <label htmlFor="edit_course_code" className="field-label">
              Course code <span className="text-danger-600">*</span>
            </label>
            <input
              type="text"
              id="edit_course_code"
              name="course_code"
              className="input uppercase"
              defaultValue={state.values?.courseCode ?? course.courseCode}
              required
              autoComplete="off"
            />
          </div>

          <div>
            <label htmlFor="edit_course_name" className="field-label">
              Course name <span className="text-danger-600">*</span>
            </label>
            <input
              type="text"
              id="edit_course_name"
              name="course_name"
              className="input"
              defaultValue={state.values?.courseName ?? course.courseName}
              required
              autoComplete="off"
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
            {pending ? "Updating…" : "Update Course"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
