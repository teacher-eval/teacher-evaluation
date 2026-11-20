"use client";

import { useActionState, useEffect, useMemo, useState } from "react";

import { ModalShell } from "@/components/ui/modal-shell";
import {
  promoteStudentsAction,
  type PromotionActionState,
} from "@/server/actions/admin-students";
import type {
  PromotionCandidate,
  PromotionPreview,
} from "@/server/queries/admin-students";

const initialState: PromotionActionState = { ok: false };

/**
 * Academic years are strings, and YYYY-YYYY sorts chronologically, so a plain
 * string comparison is enough to know whether a student was already rolled into
 * a given year.
 */
function isEligible(candidate: PromotionCandidate, academicYear: string): boolean {
  return (
    candidate.lastPromotedAcademicYear === null ||
    candidate.lastPromotedAcademicYear < academicYear
  );
}

/**
 * Students who registered on or after the target year's start date are most
 * likely brand-new entrants for that year, so they start unchecked. The admin
 * can still tick them if they really need promoting.
 */
function defaultDeselected(preview: PromotionPreview, academicYear: string): Set<number> {
  const cutoff = preview.periodStartDates[academicYear];
  if (!cutoff) return new Set();
  return new Set(
    preview.candidates
      .filter(
        (candidate) =>
          isEligible(candidate, academicYear) && candidate.registeredAt >= cutoff,
      )
      .map((candidate) => candidate.id),
  );
}

export function PromoteStudentsModal({
  preview,
  onClose,
  onSuccess,
}: {
  preview: PromotionPreview;
  onClose: () => void;
  onSuccess: (message: string) => void;
}) {
  const [state, formAction, pending] = useActionState(promoteStudentsAction, initialState);
  const [academicYear, setAcademicYear] = useState(preview.defaultAcademicYear);
  const [deselected, setDeselected] = useState<Set<number>>(() =>
    defaultDeselected(preview, preview.defaultAcademicYear),
  );

  const cutoff = preview.periodStartDates[academicYear];

  useEffect(() => {
    if (state.ok) onSuccess(state.message ?? "Students promoted successfully!");
  }, [state.ok, state.message, onSuccess]);

  const eligible = useMemo(
    () => preview.candidates.filter((candidate) => isEligible(candidate, academicYear)),
    [preview.candidates, academicYear],
  );

  const selected = useMemo(
    () => eligible.filter((candidate) => !deselected.has(candidate.id)),
    [eligible, deselected],
  );

  const graduating = selected.filter((candidate) => candidate.nextLevel === null).length;
  const allSelected = eligible.length > 0 && selected.length === eligible.length;

  function changeYear(year: string) {
    setAcademicYear(year);
    setDeselected(defaultDeselected(preview, year));
  }

  function toggle(id: number) {
    setDeselected((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (allSelected) {
      setDeselected(new Set(eligible.map((candidate) => candidate.id)));
    } else {
      setDeselected(new Set());
    }
  }

  return (
    <ModalShell
      title="Promote Students"
      subtitle="Move students to the next year level for a new academic year."
      size="xl"
      onClose={onClose}
    >
      <form action={formAction} className="flex min-h-0 flex-1 flex-col">
        <input type="hidden" name="academic_year" value={academicYear} />

        <div className="modal-body space-y-5">
          <div>
            <label htmlFor="promotion_academic_year" className="field-label">
              Academic year <span className="text-danger-600">*</span>
            </label>
            <select
              id="promotion_academic_year"
              className="select"
              value={academicYear}
              onChange={(event) => changeYear(event.target.value)}
              required
            >
              {preview.academicYears.map((year) => (
                <option key={year} value={year}>
                  AY {year}
                </option>
              ))}
            </select>
            <p className="field-hint">
              Choose the academic year students are moving into. 1st year → 2nd
              year, 2nd year → 3rd year. 3rd years are marked as graduated.
              Students already rolled into this year are disabled.
            </p>
          </div>

          {state.message && !state.ok ? (
            <div className="alert alert-error" role="alert">
              <span className="flex-1">{state.message}</span>
            </div>
          ) : null}

          {eligible.length > 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600">
              <span>
                <strong className="text-slate-900">{selected.length}</strong> of{" "}
                {eligible.length} selected
                {graduating > 0 ? ` · ${graduating} will graduate` : ""}
              </span>
              <button
                type="button"
                className="btn btn-secondary min-h-[2.25rem] px-3 py-1.5 text-xs"
                onClick={toggleAll}
              >
                {allSelected ? "Clear all" : "Select all"}
              </button>
            </div>
          ) : null}

          <div className="overflow-hidden rounded-xl border border-slate-200">
            <div className="max-h-[22rem] overflow-y-auto">
              <table className="data-table">
                <caption className="sr-only">
                  Students eligible for the academic year rollover
                </caption>
                <thead>
                  <tr>
                    <th scope="col" className="w-10 text-center">
                      <span className="sr-only">Include</span>
                    </th>
                    <th scope="col">Student</th>
                    <th scope="col">Course</th>
                    <th scope="col" className="text-center">
                      Current
                    </th>
                    <th scope="col" className="text-center">
                      Next
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {preview.candidates.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-500">
                        No active students to promote.
                      </td>
                    </tr>
                  ) : (
                    preview.candidates.map((candidate) => {
                      const eligibleForYear = isEligible(candidate, academicYear);
                      const checked =
                        eligibleForYear && !deselected.has(candidate.id);

                      return (
                        <tr key={candidate.id}>
                          <td className="text-center">
                            <input
                              type="checkbox"
                              name="student_ids"
                              value={candidate.id}
                              checked={checked}
                              disabled={!eligibleForYear}
                              onChange={() => toggle(candidate.id)}
                              aria-label={`Promote ${candidate.fullName}`}
                              className="h-4 w-4 rounded border-slate-300 text-navy focus:ring-navy/30 disabled:cursor-not-allowed disabled:opacity-40"
                            />
                          </td>
                          <td>
                            <span className="block max-w-[11rem] truncate font-semibold text-slate-900">
                              {candidate.fullName}
                            </span>
                            <span className="block text-xs text-slate-500">
                              {eligibleForYear ? (
                                <>
                                  Registered {candidate.registeredLabel}
                                  {cutoff && candidate.registeredAt >= cutoff
                                    ? " · new this year"
                                    : ""}
                                </>
                              ) : (
                                `Already rolled into AY ${candidate.lastPromotedAcademicYear}`
                              )}
                            </span>
                          </td>
                          <td className="font-medium text-slate-600">{candidate.course}</td>
                          <td className="text-center text-slate-600">
                            Year {candidate.yearLevel}
                          </td>
                          <td className="text-center">
                            {candidate.nextLevel === null ? (
                              <span className="badge badge-gold">Graduate</span>
                            ) : (
                              <span className="font-medium text-slate-700">
                                Year {candidate.nextLevel}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={pending || selected.length === 0}
          >
            {pending
              ? "Promoting…"
              : selected.length === 0
                ? "Select students"
                : `Promote ${selected.length} student${selected.length === 1 ? "" : "s"}`}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
