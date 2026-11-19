"use client";

import { useActionState, useState } from "react";

import { AlertIcon, CheckIcon, PlusIcon, TrashIcon } from "@/components/icons";
import {
  saveEvaluationQuestionsAction,
  type SaveQuestionsState,
} from "@/server/actions/admin-evaluation-form";
import {
  DEFAULT_QUESTIONS,
  type QuestionItem,
} from "@/lib/evaluation-defaults";

const initialState: SaveQuestionsState = { ok: false };

export function EvaluationFormBuilder({
  initialQuestions,
}: {
  initialQuestions: QuestionItem[];
}) {
  const [questions, setQuestions] = useState<string[]>(() =>
    initialQuestions.map((q) => q.questionText),
  );
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [alertWarning, setAlertWarning] = useState<string | null>(null);

  const [state, formAction, isPending] = useActionState(
    saveEvaluationQuestionsAction,
    initialState,
  );

  function handleAddQuestion() {
    if (questions.length >= 10) {
      setAlertWarning("You can have a maximum of 10 evaluation criteria.");
      return;
    }
    setAlertWarning(null);
    setQuestions((prev) => [...prev, ""]);
  }

  function handleRemoveQuestion(index: number) {
    if (questions.length <= 1) {
      setAlertWarning(
        "The evaluation form must keep at least 1 criterion. Add another before removing this one.",
      );
      return;
    }
    setAlertWarning(null);
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  }

  function handleTextChange(index: number, value: string) {
    setQuestions((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }

  function handleMove(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= questions.length) return;
    setQuestions((prev) => {
      const next = [...prev];
      const temp = next[index];
      next[index] = next[target];
      next[target] = temp;
      return next;
    });
  }

  function handleResetToDefault() {
    setQuestions([...DEFAULT_QUESTIONS]);
    setShowResetConfirm(false);
    setAlertWarning(null);
  }

  return (
    <>
      {state.message && (
        <div
          className={`alert mb-6 ${state.ok ? "alert-success" : "alert-error"}`}
          role="status"
        >
          {state.ok ? (
            <CheckIcon className="mt-0.5 h-5 w-5 shrink-0" />
          ) : (
            <AlertIcon className="mt-0.5 h-5 w-5 shrink-0" />
          )}
          <span className="font-medium">{state.message}</span>
        </div>
      )}

      {alertWarning && (
        <div className="alert alert-error mb-6" role="alert">
          <AlertIcon className="mt-0.5 h-5 w-5 shrink-0" />
          <span className="font-medium">{alertWarning}</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Editor column */}
        <div className="xl:col-span-2">
          <div className="card p-5 sm:p-6">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="section-heading">Evaluation Criteria</h2>
                <p className="section-subheading">
                  Reorder and edit criteria. Numbers map onto the stored rating columns,
                  so reordering relabels historic results in reports.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddQuestion}
                disabled={questions.length >= 10 || isPending}
                className="btn btn-primary btn-sm inline-flex items-center gap-1.5 disabled:opacity-50"
              >
                <PlusIcon className="h-4 w-4" />
                Add Criterion
              </button>
            </div>

            <form action={formAction} id="evaluationForm">
              <div className="space-y-3">
                {questions.map((text, i) => (
                  <div
                    key={i}
                    className="question-item group flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3"
                  >
                    <div className="question-number flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-navy-100 text-sm font-bold text-navy">
                      {i + 1}
                    </div>

                    {/* Move up / down controls */}
                    <div className="flex shrink-0 flex-col gap-0.5 text-slate-400">
                      <button
                        type="button"
                        onClick={() => handleMove(i, -1)}
                        disabled={i === 0 || isPending}
                        className="rounded p-0.5 hover:bg-slate-200 hover:text-slate-700 disabled:opacity-20"
                        title="Move criterion up"
                        aria-label={`Move criterion ${i + 1} up`}
                      >
                        <svg
                          className="h-3.5 w-3.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2.5}
                            d="M5 15l7-7 7 7"
                          />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMove(i, 1)}
                        disabled={i === questions.length - 1 || isPending}
                        className="rounded p-0.5 hover:bg-slate-200 hover:text-slate-700 disabled:opacity-20"
                        title="Move criterion down"
                        aria-label={`Move criterion ${i + 1} down`}
                      >
                        <svg
                          className="h-3.5 w-3.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2.5}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </button>
                    </div>

                    <input
                      type="text"
                      name="question_text"
                      value={text}
                      onChange={(e) => handleTextChange(i, e.target.value)}
                      className="input flex-1"
                      placeholder="Enter criterion text…"
                      maxLength={500}
                      required
                    />

                    <button
                      type="button"
                      onClick={() => handleRemoveQuestion(i)}
                      disabled={isPending}
                      className="icon-btn icon-btn-danger h-9 w-9 shrink-0 opacity-80 transition-opacity hover:opacity-100 group-hover:opacity-100 focus:opacity-100"
                      title="Remove criterion"
                      aria-label={`Remove criterion ${i + 1}`}
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button
                  type="submit"
                  disabled={isPending}
                  className="btn btn-primary flex-1 inline-flex items-center justify-center gap-2"
                >
                  {isPending ? (
                    <>
                      <svg
                        className="h-4 w-4 animate-spin text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                        />
                      </svg>
                      Saving Changes…
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowResetConfirm(true)}
                  disabled={isPending}
                  className="btn btn-secondary"
                  title="Reset to default 10 criteria"
                >
                  Reset
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Live Preview column */}
        <div className="xl:col-span-1">
          <div className="card sticky top-8 p-5 sm:p-6">
            <h2 className="section-heading">Live Preview</h2>
            <p className="section-subheading mb-4">How students will see the form</p>

            <div className="alert alert-warning mb-4 text-xs">
              <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Rate using the scale: <strong>Very Poor (1)</strong> to{" "}
                <strong>Excellence (5)</strong>.
              </span>
            </div>

            <div className="space-y-2">
              {questions.map((text, i) => {
                const trimmed = text.trim();
                return (
                  <div
                    key={i}
                    className="flex items-start gap-3 border-b border-slate-50 py-2"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-navy-100 text-xs font-bold text-navy">
                      {i + 1}
                    </span>
                    <span className="text-xs leading-relaxed text-slate-600">
                      {trimmed.length > 0 ? (
                        trimmed
                      ) : (
                        <em className="text-slate-300">Empty criterion</em>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 border-t border-slate-100 pt-4">
              <p className="text-center text-xs text-slate-400">
                <span>{questions.length}</span> / 10 criteria · 5-point scale
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Reset Confirmation Dialog */}
      {showResetConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="card max-w-sm p-6 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900">
              Reset to default criteria?
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              This replaces your current questions with the 10 default TVET criteria and
              clears any unsaved edits.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="btn btn-secondary btn-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResetToDefault}
                className="btn btn-danger btn-sm"
              >
                Reset criteria
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
