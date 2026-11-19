import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/app-shell";
import {
  EvaluationBoard,
  type Assignment,
} from "@/components/student/evaluation-board";
import { daysFromToday, formatDate, isoDateOnly, semesterLabel, todayIso } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { teacherAvatarUrl } from "@/lib/storage-url";

export const metadata: Metadata = { title: "Teacher Evaluation" };
export const dynamic = "force-dynamic";

export default async function StudentDashboardPage() {
  const user = await requireRole("student");

  const [student, activeEvaluation, criteria] = await Promise.all([
    prisma.student.findUnique({
      where: { userId: user.id },
      select: { course: true, yearLevel: true },
    }),
    prisma.evaluationSetting.findFirst({
      where: { isActive: true },
      orderBy: { id: "desc" },
    }),
    prisma.evaluationQuestion.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { questionNo: "asc" }],
      select: { questionNo: true, questionText: true },
    }),
  ]);

  const subjects = student
    ? await prisma.subject.findMany({
        where: {
          course: student.course,
          yearLevel: student.yearLevel,
          status: "active",
          teacher: { status: "active" },
        },
        select: {
          id: true,
          subjectName: true,
          course: true,
          teacherId: true,
          teacher: {
            select: {
              profileImage: true,
              user: { select: { fullName: true } },
            },
          },
        },
        orderBy: [{ teacher: { user: { fullName: "asc" } } }, { subjectName: "asc" }],
      })
    : [];

  const today = todayIso();
  const evaluationActive = Boolean(
    activeEvaluation &&
      isoDateOnly(activeEvaluation.startDate) <= today &&
      isoDateOnly(activeEvaluation.endDate) >= today,
  );

  // Completed = a reaction for this student, teacher and subject *today*. The
  // unique index (unique_daily_evaluation) allows one evaluation per day, so
  // the card must clear again the next day.
  const completed = new Set<string>();
  if (activeEvaluation && evaluationActive) {
    const todayDate = new Date(`${today}T00:00:00Z`);
    const rows = await prisma.reaction.findMany({
      where: { studId: user.id, date: todayDate },
      select: { teacherId: true, subject: true },
    });
    for (const row of rows) {
      completed.add(`${row.teacherId}|${row.subject}`);
    }
  }

  const assignments: Assignment[] = subjects.map((subject) => {
    const subjectInfo = `${subject.subjectName} - ${subject.course}`;
    return {
      teacherId: subject.teacherId,
      subjectId: subject.id,
      teacherName: subject.teacher.user.fullName,
      subjectName: subject.subjectName,
      course: subject.course,
      avatarUrl: teacherAvatarUrl(subject.teacher.profileImage),
      completed: completed.has(`${subject.teacherId}|${subjectInfo}`),
    };
  });

  const daysUntilStart =
    activeEvaluation && !evaluationActive
      ? daysFromToday(activeEvaluation.startDate)
      : Number.NaN;
  const showUpcomingNotice =
    Number.isFinite(daysUntilStart) && daysUntilStart >= 0 && daysUntilStart <= 2;

  return (
    <>
      <PageHeader
        title="Teacher Evaluation"
        subtitle={`Welcome back, ${user.fullName}`}
        actions={
          evaluationActive ? (
            <span className="inline-flex items-center gap-2 rounded-xl border border-success-100 bg-success-50 px-4 py-2.5 text-sm font-semibold text-success-700">
              <span className="h-2 w-2 rounded-full bg-success-600" aria-hidden="true" />
              Evaluation open
            </span>
          ) : null
        }
      />

      {showUpcomingNotice && activeEvaluation ? (
        <div
          className="alert alert-warning mb-6 border-navy-200 bg-navy-50 text-navy-800"
          role="status"
        >
          <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-navy-100 text-navy">
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
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </span>
          <div>
            <p className="font-semibold">Evaluation period starting soon</p>
            <p className="mt-0.5 text-sm text-navy-700">
              {daysUntilStart === 0 ? (
                <>
                  The evaluation period starts <strong>today</strong> (
                  {formatDate(activeEvaluation.startDate)}). Get ready to evaluate your
                  teachers.
                </>
              ) : daysUntilStart === 1 ? (
                <>
                  The evaluation period starts <strong>tomorrow</strong> (
                  {formatDate(activeEvaluation.startDate)}). Get ready to evaluate your
                  teachers.
                </>
              ) : (
                <>
                  The evaluation period starts in{" "}
                  <strong>{daysUntilStart} days</strong> on{" "}
                  {formatDate(activeEvaluation.startDate)}.
                </>
              )}
            </p>
          </div>
        </div>
      ) : null}

      {evaluationActive && activeEvaluation ? (
        <div className="alert alert-success mb-6" role="status">
          <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-success-100 text-success-700">
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
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
          </span>
          <div>
            <p className="font-semibold">Evaluation period is now open</p>
            <p className="mt-0.5 text-sm text-success-700">
              Submit your teacher evaluations before{" "}
              {formatDate(activeEvaluation.endDate)}. Your feedback helps improve our
              education quality.
            </p>
          </div>
        </div>
      ) : null}

      {!evaluationActive ? (
        <div className="card">
          <div className="empty-state mx-auto max-w-2xl">
            <div className="empty-state-icon bg-gold-100 text-gold-700">
              <svg
                className="h-9 w-9"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h2 className="font-display text-2xl font-bold text-slate-900">
              Evaluation not available
            </h2>
            <p className="empty-state-text mb-6">
              The teacher evaluation period is not currently active. Please check back
              during the scheduled evaluation period.
            </p>
            {activeEvaluation &&
            Number.isFinite(daysUntilStart) &&
            daysUntilStart >= 0 ? (
              <div className="subtle-panel inline-block text-left">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Next evaluation period
                </p>
                <p className="mt-1 text-lg font-bold text-navy">
                  {formatDate(activeEvaluation.startDate)} –{" "}
                  {formatDate(activeEvaluation.endDate)}
                </p>
              </div>
            ) : null}
          </div>
        </div>
      ) : (
        <>
          <div className="mb-6 rounded-2xl bg-gradient-to-br from-navy to-navy-600 p-5 text-white shadow-card sm:p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-white/10">
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
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <div>
                <p className="font-display text-lg font-bold">Active Evaluation Period</p>
                <p className="mt-0.5 text-sm text-navy-100">
                  {formatDate(activeEvaluation!.startDate)} –{" "}
                  {formatDate(activeEvaluation!.endDate)} ·{" "}
                  {activeEvaluation!.academicYear} ({semesterLabel(activeEvaluation!.semester)})
                </p>
              </div>
            </div>
          </div>

          <EvaluationBoard
            assignments={assignments}
            criteria={criteria.map((question) => ({
              questionNo: question.questionNo,
              questionText: question.questionText,
            }))}
          />
        </>
      )}
    </>
  );
}
