"use client";

import Image from "next/image";
import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { ChevronLeftIcon, CloseIcon } from "@/components/icons";
import {
  submitEvaluationAction,
  type EvaluationFormState,
} from "@/server/actions/evaluation";

export type Criterion = {
  questionNo: number;
  questionText: string;
};

export type Assignment = {
  teacherId: number;
  subjectId: number;
  teacherName: string;
  subjectName: string;
  course: string;
  avatarUrl: string | null;
  completed: boolean;
};

const initialState: EvaluationFormState = { ok: false };

const RATING_LABELS: Record<number, string> = {
  1: "Very Poor",
  2: "Poor",
  3: "Fair",
  4: "Good",
  5: "Excellence",
};

export function EvaluationBoard({
  assignments,
  criteria,
}: {
  assignments: Assignment[];
  criteria: Criterion[];
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<Assignment | null>(null);
  const closeModal = useCallback(() => setSelected(null), []);

  function scrollByCard(direction: number) {
    const first = scroller.current?.querySelector<HTMLElement>("[data-card]");
    if (!first || !scroller.current) return;
    scroller.current.scrollBy({
      left: (first.offsetWidth + 16) * direction,
      behavior: "smooth",
    });
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="section-heading text-xl">Assigned Evaluations</h2>
          <p className="section-subheading">Select a teacher to submit your feedback</p>
        </div>
        <div className="hidden gap-2 sm:flex">
          <button
            type="button"
            onClick={() => scrollByCard(-1)}
            className="icon-btn border border-slate-200"
            aria-label="Previous teachers"
          >
            <ChevronLeftIcon className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => scrollByCard(1)}
            className="icon-btn border border-slate-200"
            aria-label="Next teachers"
          >
            <ChevronLeftIcon className="h-5 w-5 rotate-180" />
          </button>
        </div>
      </div>

      <div className="relative">
        <div
          ref={scroller}
          className="no-scrollbar flex flex-col gap-4 pb-4 pt-1 sm:flex-row sm:overflow-x-auto sm:scroll-smooth md:snap-x md:snap-mandatory"
        >
          {assignments.map((assignment) => (
            <div
              key={assignment.subjectId}
              data-card
              className="w-full sm:w-[320px] sm:flex-none md:snap-center"
            >
              <AssignmentCard
                assignment={assignment}
                onSelect={() => setSelected(assignment)}
              />
            </div>
          ))}

          {assignments.length === 0 ? (
            <div className="card empty-state w-full">
              <div className="empty-state-icon">
                <svg
                  className="h-7 w-7"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.084.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.084.477-4.5 1.253"
                  />
                </svg>
              </div>
              <p className="empty-state-title">No assigned teachers</p>
              <p className="empty-state-text">
                No teachers are assigned to your section yet. Please contact the TVET
                office.
              </p>
            </div>
          ) : null}
        </div>
      </div>

      {selected ? (
        <EvaluationModal
          assignment={selected}
          criteria={criteria}
          onClose={closeModal}
        />
      ) : null}
    </>
  );
}

function AssignmentCard({
  assignment,
  onSelect,
}: {
  assignment: Assignment;
  onSelect: () => void;
}) {
  const { completed, teacherName, subjectName, course, avatarUrl } = assignment;

  const body = (
    <>
      {completed ? (
        <span className="badge badge-success absolute right-4 top-4">Completed</span>
      ) : null}

      {avatarUrl ? (
        <div className="relative mx-auto mb-4 h-24 w-24">
          <Image
            src={avatarUrl}
            alt=""
            width={96}
            height={96}
            className={`h-full w-full rounded-full border-2 object-cover shadow-sm ${
              completed ? "border-success-100" : "border-navy-100"
            }`}
          />
        </div>
      ) : (
        <div
          className={`mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl ${
            completed ? "bg-success-50 text-success-700" : "bg-navy-50 text-navy"
          }`}
        >
          <span className="text-3xl font-bold">{teacherName.charAt(0).toUpperCase()}</span>
        </div>
      )}

      <h3 className="mb-1 line-clamp-1 text-center font-display text-lg font-bold text-slate-900">
        {teacherName.toUpperCase()}
      </h3>
      <p className="mb-4 line-clamp-2 text-center text-xs leading-relaxed text-slate-500">
        {`${subjectName} - ${course}`.toUpperCase()}
      </p>

      <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-4">
        <span
          className={`text-[10px] font-bold uppercase tracking-wider ${
            completed ? "text-success-700" : "text-slate-500"
          }`}
        >
          {completed ? "Completed" : "Pending evaluation"}
        </span>
        {!completed ? (
          <span className="text-xs font-bold text-navy">Evaluate →</span>
        ) : null}
      </div>
    </>
  );

  const classes = `card relative flex h-full flex-col border-l-[3px] p-5 text-left transition-shadow duration-200 ${
    completed
      ? "border-l-success-600"
      : "cursor-pointer border-l-navy hover:shadow-raised focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-500 focus-visible:ring-offset-2"
  }`;

  if (completed) {
    return <div className={classes}>{body}</div>;
  }

  return (
    <button
      type="button"
      className={classes}
      onClick={onSelect}
      aria-label={`Evaluate ${teacherName}`}
    >
      {body}
    </button>
  );
}

function EvaluationModal({
  assignment,
  criteria,
  onClose,
}: {
  assignment: Assignment;
  criteria: Criterion[];
  onClose: () => void;
}) {
  const router = useRouter();
  const panel = useRef<HTMLDivElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(
    submitEvaluationAction,
    initialState,
  );
  const [rated, setRated] = useState(0);

  // Escape closes; the page behind must not scroll while the dialog is open.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    panel.current
      ?.querySelector<HTMLElement>(
        "button, input:not([type='hidden']), textarea",
      )
      ?.focus();

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  // A successful submission closes the dialog and shows the refreshed state.
  useEffect(() => {
    if (!state.ok) return;
    router.refresh();
    onClose();
  }, [state.ok, onClose, router]);

  function countRated() {
    const checked = form.current?.querySelectorAll('input[type="radio"]:checked');
    setRated(checked?.length ?? 0);
  }

  return (
    <div
      className="fixed inset-0 z-[100] overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modalTeacherName"
    >
      <div className="modal-backdrop" onClick={onClose} aria-hidden="true" />
      <div
        className="flex min-h-screen cursor-pointer items-center justify-center p-4 sm:p-6"
        onClick={onClose}
      >
        <div
          ref={panel}
          className="modal-panel animate-modal-in max-w-2xl cursor-default"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="modal-header">
            <div>
              <h2 className="modal-title" id="modalTeacherName">
                {assignment.teacherName}
              </h2>
              <p className="modal-subtitle">
                {assignment.subjectName} - {assignment.course}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close evaluation form"
              className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-navy-100 transition-colors hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-400"
            >
              <CloseIcon className="h-5 w-5" />
            </button>
          </div>

          <div className="modal-body">
            <form
              ref={form}
              action={formAction}
              key={assignment.subjectId}
              id="submitEvaluationForm"
              onChange={(event) => {
                const target = event.target as unknown as HTMLInputElement;
                if (target.type === "radio") countRated();
              }}
            >
              <input type="hidden" name="teacher_id" value={assignment.teacherId} />
              <input type="hidden" name="subject_id" value={assignment.subjectId} />

              <div className="alert alert-warning mb-5">
                <svg
                  className="mt-0.5 h-4 w-4 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p>
                  Rate each area from <strong>1 (Very Poor)</strong> to{" "}
                  <strong>5 (Excellence)</strong>. All criteria are required.
                </p>
              </div>

              <div className="space-y-1">
                {criteria.map((criterion) => (
                  <fieldset
                    key={criterion.questionNo}
                    className="border-b border-slate-100 py-4 first:pt-0 last:border-0"
                  >
                    <legend className="mb-3 text-sm font-medium leading-snug text-slate-700">
                      <span className="font-bold text-slate-400">
                        {criterion.questionNo}.
                      </span>{" "}
                      {criterion.questionText}
                    </legend>
                    <div className="grid grid-cols-5 gap-2">
                      {[1, 2, 3, 4, 5].map((value) => (
                        <label key={value} className="rating-option">
                          <input
                            type="radio"
                            name={`q${criterion.questionNo}`}
                            value={value}
                            required
                          />
                          <span>{value}</span>
                          <span className="rating-caption hidden sm:block">
                            {RATING_LABELS[value]}
                          </span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                ))}
              </div>

              <div className="mb-5 mt-6">
                <label htmlFor="comment" className="field-label">
                  Comments <span className="font-normal text-slate-400">(optional)</span>
                </label>
                <textarea
                  name="comment"
                  id="comment"
                  className="textarea h-24"
                  maxLength={500}
                  placeholder="What can you say about this teacher's performance? Your feedback matters."
                />
                <p className="field-hint text-right">Maximum 500 characters</p>
              </div>

              {state.message && !state.ok ? (
                <div className="alert alert-error mb-5" role="alert">
                  <span className="flex-1">{state.message}</span>
                </div>
              ) : null}
            </form>
          </div>

          <div className="modal-footer">
            <p
              className="mr-auto hidden text-xs font-medium text-slate-500 sm:block"
              aria-live="polite"
            >
              {rated} of {criteria.length} rated
            </p>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary sm:w-auto"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="submitEvaluationForm"
              className="btn btn-primary sm:w-auto"
              disabled={pending}
            >
              {pending ? "Submitting…" : "Submit Evaluation"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
