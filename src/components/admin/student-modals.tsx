"use client";

import { useActionState, useEffect } from "react";

import { ModalShell } from "@/components/ui/modal-shell";
import {
  updateStudentAction,
  type StudentFormState,
} from "@/server/actions/admin-students";
import type { StudentRow } from "@/server/queries/admin-students";

const initialState: StudentFormState = { ok: false };

type Course = { courseCode: string };

export function EditStudentModal({
  student,
  courses,
  onClose,
  onSuccess,
}: {
  student: StudentRow;
  courses: Course[];
  onClose: () => void;
  onSuccess: (message: string) => void;
}) {
  const [state, formAction, pending] = useActionState(updateStudentAction, initialState);

  useEffect(() => {
    if (state.ok) onSuccess(state.message ?? "Student updated successfully!");
  }, [state.ok, state.message, onSuccess]);

  return (
    <ModalShell
      title="Edit Student"
      subtitle="Update account details, course or status."
      onClose={onClose}
    >
      <form action={formAction} className="flex min-h-0 flex-1 flex-col">
        <input type="hidden" name="id" value={student.id} />

        <div className="modal-body space-y-5">
          <div>
            <label htmlFor="edit_student_username" className="field-label">
              Username <span className="text-danger-600">*</span>
            </label>
            <input
              type="text"
              id="edit_student_username"
              name="username"
              className="input"
              defaultValue={state.values?.username ?? student.username}
              required
              autoComplete="off"
            />
          </div>

          <div>
            <label htmlFor="edit_student_full_name" className="field-label">
              Full name <span className="text-danger-600">*</span>
            </label>
            <input
              type="text"
              id="edit_student_full_name"
              name="full_name"
              className="input"
              defaultValue={state.values?.fullName ?? student.fullName}
              required
              autoComplete="off"
            />
          </div>

          <div>
            <label htmlFor="edit_student_course" className="field-label">
              Course <span className="text-danger-600">*</span>
            </label>
            <select
              id="edit_student_course"
              name="course"
              className="select"
              defaultValue={state.values?.course ?? student.course}
              required
            >
              <option value="">Select course</option>
              {courses.map((course) => (
                <option key={course.courseCode} value={course.courseCode}>
                  {course.courseCode}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="edit_student_year_level" className="field-label">
              Year level <span className="text-danger-600">*</span>
            </label>
            <select
              id="edit_student_year_level"
              name="year_level"
              className="select"
              defaultValue={state.values?.yearLevel ?? String(student.yearLevel)}
              required
            >
              <option value="1">1st Year</option>
              <option value="2">2nd Year</option>
              <option value="3">3rd Year</option>
            </select>
          </div>

          <div>
            <label htmlFor="edit_student_status" className="field-label">
              Status <span className="text-danger-600">*</span>
            </label>
            <select
              id="edit_student_status"
              name="status"
              className="select"
              defaultValue={state.values?.status ?? student.status}
              required
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
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
            {pending ? "Updating…" : "Update Student"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
