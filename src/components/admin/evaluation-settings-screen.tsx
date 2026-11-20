"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";

import { AlertIcon, CheckIcon, CloseIcon, PlusIcon, TrashIcon } from "@/components/icons";
import { formatDate, semesterLabel } from "@/lib/dates";
import {
  activateEvaluationPeriodAction,
  createEvaluationPeriodAction,
  deleteEvaluationPeriodAction,
  terminateEvaluationPeriodAction,
  updateEvaluationPeriodAction,
} from "@/server/actions/admin-evaluation-settings";
import type {
  EvaluationSettingsData,
  SettingItem,
} from "@/server/queries/admin-evaluation-settings";

type ModalState =
  | { type: "add" }
  | { type: "edit"; setting: SettingItem }
  | { type: "end_confirm" }
  | { type: "delete_confirm"; id: number }
  | null;

type Notice = { tone: "success" | "error"; message: string };

export function EvaluationSettingsScreen({
  data,
}: {
  data: EvaluationSettingsData;
}) {
  const router = useRouter();
  const [modal, setModal] = useState<ModalState>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [pending, startTransition] = useTransition();

  const closeModal = useCallback(() => setModal(null), []);

  function handleEndPeriod() {
    startTransition(async () => {
      const result = await terminateEvaluationPeriodAction();
      setModal(null);
      if (result.ok) {
        setNotice({ tone: "success", message: result.message || "Period ended." });
        router.refresh();
      } else {
        setNotice({ tone: "error", message: result.message || "Failed to end period." });
      }
    });
  }

  function handleActivate(id: number) {
    startTransition(async () => {
      const result = await activateEvaluationPeriodAction(id);
      if (result.ok) {
        setNotice({ tone: "success", message: result.message || "Period activated!" });
        router.refresh();
      } else {
        setNotice({ tone: "error", message: result.message || "Failed to activate period." });
      }
    });
  }

  function handleDelete(id: number) {
    startTransition(async () => {
      const result = await deleteEvaluationPeriodAction(id);
      setModal(null);
      if (result.ok) {
        setNotice({ tone: "success", message: result.message || "Period deleted." });
        router.refresh();
      } else {
        setNotice({ tone: "error", message: result.message || "Failed to delete period." });
      }
    });
  }

  async function handleAddSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await createEvaluationPeriodAction({ ok: false }, formData);
      if (result.ok) {
        setModal(null);
        setNotice({
          tone: "success",
          message: result.message || "Period created successfully!",
        });
        router.refresh();
      } else {
        setNotice({
          tone: "error",
          message: result.message || "Failed to create period.",
        });
      }
    });
  }

  async function handleEditSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await updateEvaluationPeriodAction({ ok: false }, formData);
      if (result.ok) {
        setModal(null);
        setNotice({
          tone: "success",
          message: result.message || "Period updated successfully!",
        });
        router.refresh();
      } else {
        setNotice({
          tone: "error",
          message: result.message || "Failed to update period.",
        });
      }
    });
  }

  const { activeSetting, allSettings } = data;

  return (
    <>
      {notice && (
        <div
          className={`alert mb-6 ${
            notice.tone === "success" ? "alert-success" : "alert-error"
          }`}
          role="status"
        >
          {notice.tone === "success" ? (
            <CheckIcon className="mt-0.5 h-5 w-5 shrink-0" />
          ) : (
            <AlertIcon className="mt-0.5 h-5 w-5 shrink-0" />
          )}
          <span className="flex-1 font-medium">{notice.message}</span>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="text-slate-400 hover:text-slate-600"
            aria-label="Dismiss notice"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Current Evaluation Period card */}
      {activeSetting && (
        <section
          className={`card mb-6 border-l-4 p-5 sm:p-6 ${
            activeSetting.isActive ? "border-l-success-600" : "border-l-navy"
          }`}
          aria-labelledby="current-period-title"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 id="current-period-title" className="section-heading">
                Current Evaluation Period
              </h2>
              <p className="section-subheading">
                The period students can submit evaluations within.
              </p>
            </div>
            <span className={activeSetting.statusBadgeClass}>
              {activeSetting.status}
            </span>
          </div>

          <dl className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <dt className="stat-label">Academic Year</dt>
              <dd className="text-sm font-semibold text-slate-800">
                {activeSetting.academicYear}
              </dd>
            </div>
            <div>
              <dt className="stat-label">Semester</dt>
              <dd className="text-sm font-semibold text-slate-800">
                {semesterLabel(activeSetting.semester)}
              </dd>
            </div>
            <div>
              <dt className="stat-label">Period</dt>
              <dd className="text-sm font-semibold text-slate-800">
                {formatDate(activeSetting.startDate)} – {formatDate(activeSetting.endDate)}
              </dd>
            </div>
          </dl>

          {activeSetting.isCurrentlyRunning && (
            <div className="mt-5 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setModal({ type: "end_confirm" })}
                disabled={pending}
                className="btn btn-danger btn-sm inline-flex items-center gap-1.5"
              >
                <CloseIcon className="h-4 w-4" />
                End Evaluation
              </button>
            </div>
          )}
        </section>
      )}

      {/* Settings History card */}
      <div className="card p-5 sm:p-6">
        <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="section-heading">Settings History</h2>
            <p className="section-subheading">
              Every configured evaluation period, newest first.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setModal({ type: "add" })}
            className="btn btn-primary btn-sm inline-flex items-center gap-1.5 whitespace-nowrap"
          >
            <PlusIcon className="h-4 w-4" />
            New Evaluation Period
          </button>
        </div>

        {allSettings.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-500">
            No evaluation periods have been configured yet.
          </div>
        ) : (
          <div className="custom-scrollbar max-h-[500px] space-y-3 overflow-y-auto pr-1">
            {allSettings.map((setting) => (
              <div
                key={setting.id}
                className="rounded-xl border border-slate-200 p-4 transition-colors hover:bg-slate-50"
              >
                <div className="mb-2 flex items-start justify-between gap-3">
                  <div>
                    <div className="font-bold text-slate-900">
                      {setting.academicYear}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <span className="badge badge-info">
                        {semesterLabel(setting.semester)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={setting.statusBadgeClass}>{setting.status}</span>
                  </div>
                </div>

                <p className="mb-3 text-sm text-slate-500">
                  {formatDate(setting.startDate)} – {formatDate(setting.endDate)}
                </p>

                <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                    Evaluation Period Actions
                  </p>
                  <div className="flex items-center gap-2">
                    {!setting.isActive && (
                      <button
                        type="button"
                        onClick={() => handleActivate(setting.id)}
                        disabled={pending}
                        className="btn btn-secondary btn-sm text-xs font-semibold"
                        title="Set as active evaluation period and update student year levels"
                      >
                        Activate
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setModal({ type: "edit", setting })}
                      className="icon-btn h-9 w-9 bg-navy-50 text-navy hover:bg-navy hover:text-white"
                      title="Edit period"
                      aria-label="Edit evaluation period"
                    >
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
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
                      onClick={() =>
                        setModal({ type: "delete_confirm", id: setting.id })
                      }
                      disabled={setting.isActive}
                      className={`icon-btn h-9 w-9 ${
                        setting.isActive
                          ? "cursor-not-allowed bg-slate-50 text-slate-300"
                          : "icon-btn-danger bg-danger-50 text-danger-600 hover:bg-danger-600 hover:text-white"
                      }`}
                      title={
                        setting.isActive
                          ? "Cannot delete active period"
                          : "Delete period"
                      }
                      aria-label="Delete evaluation period"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add New Modal */}
      {modal?.type === "add" && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="card w-full max-w-md p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Configure New Evaluation Period
                </h3>
                <p className="text-xs text-slate-500">
                  Set the academic year, semester and dates.
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="text-slate-400 hover:text-slate-600"
                aria-label="Close modal"
              >
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label htmlFor="add_academic_year" className="field-label">
                  Academic year <span className="text-danger-600">*</span>
                </label>
                <input
                  type="text"
                  id="add_academic_year"
                  name="academic_year"
                  className="input"
                  placeholder="e.g. 2025-2026"
                  required
                />
              </div>

              <div>
                <label htmlFor="add_semester" className="field-label">
                  Semester <span className="text-danger-600">*</span>
                </label>
                <select id="add_semester" name="semester" className="select" required>
                  <option value="">Select semester</option>
                  <option value="1st">1st Semester</option>
                  <option value="2nd">2nd Semester</option>
                  <option value="Summer">Summer</option>
                </select>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="add_start_date" className="field-label">
                    Start date <span className="text-danger-600">*</span>
                  </label>
                  <input
                    type="date"
                    id="add_start_date"
                    name="start_date"
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="add_end_date" className="field-label">
                    End date <span className="text-danger-600">*</span>
                  </label>
                  <input
                    type="date"
                    id="add_end_date"
                    name="end_date"
                    className="input"
                    required
                  />
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
                <label
                  htmlFor="add_is_active"
                  className="flex cursor-pointer items-center gap-2.5"
                >
                  <input
                    type="checkbox"
                    id="add_is_active"
                    name="is_active"
                    value="1"
                    defaultChecked
                    className="h-4 w-4 rounded border-slate-300 text-navy focus:ring-navy/30"
                  />
                  <span className="text-sm font-medium text-slate-700">
                    Activate this evaluation period
                  </span>
                </label>
                <p className="mt-1.5 text-xs text-slate-500">
                  Activating this will deactivate all previous periods.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={pending}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="btn btn-primary inline-flex items-center gap-2"
                >
                  {pending ? "Saving…" : "Save Settings"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {modal?.type === "edit" && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="card w-full max-w-md p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Edit Evaluation Period
                </h3>
                <p className="text-xs text-slate-500">Adjust the period details.</p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="text-slate-400 hover:text-slate-600"
                aria-label="Close modal"
              >
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <input type="hidden" name="id" value={modal.setting.id} />

              <div>
                <label htmlFor="edit_academic_year" className="field-label">
                  Academic year <span className="text-danger-600">*</span>
                </label>
                <input
                  type="text"
                  id="edit_academic_year"
                  name="academic_year"
                  defaultValue={modal.setting.academicYear}
                  className="input"
                  required
                />
              </div>

              <div>
                <label htmlFor="edit_semester" className="field-label">
                  Semester <span className="text-danger-600">*</span>
                </label>
                <select
                  id="edit_semester"
                  name="semester"
                  defaultValue={modal.setting.semester}
                  className="select"
                  required
                >
                  <option value="1st">1st Semester</option>
                  <option value="2nd">2nd Semester</option>
                  <option value="Summer">Summer</option>
                </select>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="edit_start_date" className="field-label">
                    Start date <span className="text-danger-600">*</span>
                  </label>
                  <input
                    type="date"
                    id="edit_start_date"
                    name="start_date"
                    defaultValue={modal.setting.startDateIso}
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="edit_end_date" className="field-label">
                    End date <span className="text-danger-600">*</span>
                  </label>
                  <input
                    type="date"
                    id="edit_end_date"
                    name="end_date"
                    defaultValue={modal.setting.endDateIso}
                    className="input"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={pending}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="btn btn-primary inline-flex items-center gap-2"
                >
                  {pending ? "Updating…" : "Update"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* End Period Confirmation Modal */}
      {modal?.type === "end_confirm" && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="card max-w-sm p-6 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900">
              End this evaluation period?
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              Students will no longer be able to submit evaluations for this period. This
              cannot be undone.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeModal}
                disabled={pending}
                className="btn btn-secondary btn-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleEndPeriod}
                disabled={pending}
                className="btn btn-danger btn-sm"
              >
                {pending ? "Ending…" : "End evaluation"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {modal?.type === "delete_confirm" && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="card max-w-sm p-6 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900">
              Delete this evaluation period?
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              The period and its configuration will be removed. This action cannot be
              undone.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeModal}
                disabled={pending}
                className="btn btn-secondary btn-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDelete(modal.id)}
                disabled={pending}
                className="btn btn-danger btn-sm"
              >
                {pending ? "Deleting…" : "Delete period"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
