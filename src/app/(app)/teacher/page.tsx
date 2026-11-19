import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { PageHeader } from "@/components/layout/app-shell";
import { DateChip } from "@/components/layout/date-chip";
import { SatisfactionChart } from "@/components/teacher/satisfaction-chart";
import { formatAverage, formatCount, ratingBand } from "@/lib/ratings";
import { requireRole } from "@/lib/rbac";
import { teacherAvatarUrl } from "@/lib/storage-url";
import { getTeacherDashboard } from "@/server/queries/teacher-dashboard";

export const metadata: Metadata = { title: "Teacher Dashboard" };
export const dynamic = "force-dynamic";
export const revalidate = 0;

type SearchParams = Promise<{ subject?: string | string[] }>;

export default async function TeacherDashboardPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await requireRole("teacher");
  const params = await searchParams;
  const subjectParam = typeof params.subject === "string" ? params.subject : null;

  const data = await getTeacherDashboard(user.id, subjectParam);

  if (!data) {
    return (
      <>
        <PageHeader
          title="Dashboard"
          subtitle={`Welcome back, ${user.fullName}`}
          actions={<DateChip />}
        />
        <div className="card empty-state" role="status">
          <div className="empty-state-icon bg-navy-50 text-navy">
            <svg
              className="h-8 w-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <h2 className="empty-state-title">Teacher profile not found</h2>
          <p className="empty-state-text">
            Your account is not linked to a teacher record yet. Please contact the TVET
            office so they can complete your profile.
          </p>
        </div>
      </>
    );
  }

  const {
    totalEvaluations,
    averageRating,
    allTimeRating,
    availableSubjects,
    selectedSubject,
    subjectsEvaluated,
    criteria,
    distribution,
    department,
  } = data;

  const hasEvaluations = totalEvaluations > 0;
  const band = ratingBand(averageRating);
  // Same quirk as the PHP page: floor() means a 4.9 average still shows 4 stars.
  const fullStars = averageRating !== null ? Math.floor(averageRating) : 0;
  const avatarUrl = teacherAvatarUrl(data.profileImage);

  const ratedCriteria = criteria
    .filter((criterion): criterion is typeof criterion & { avg: number } =>
      criterion.avg !== null,
    )
    .sort((a, b) => b.avg - a.avg);
  const strongest = ratedCriteria[0] ?? null;
  const needsAttention = ratedCriteria[ratedCriteria.length - 1] ?? null;
  const hasCriteria = ratedCriteria.length > 0;

  const evaluationWord = totalEvaluations === 1 ? "evaluation" : "evaluations";

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle={
          <>
            Welcome back, {user.fullName}
            {department ? <span className="text-slate-400"> · {department}</span> : null}
          </>
        }
        leading={
          avatarUrl ? (
            <Image
              src={avatarUrl}
              alt=""
              width={64}
              height={64}
              className="h-14 w-14 rounded-full border-4 border-white object-cover shadow-md sm:h-16 sm:w-16"
            />
          ) : (
            <div
              className="flex h-14 w-14 items-center justify-center rounded-full border-4 border-white bg-navy-50 text-2xl font-bold text-navy shadow-md sm:h-16 sm:w-16"
              aria-hidden="true"
            >
              {user.fullName.charAt(0).toUpperCase()}
            </div>
          )
        }
        actions={<DateChip />}
      />

      {availableSubjects.length > 0 ? (
        <div className="scrollbar-hide mb-6 overflow-x-auto pb-1">
          <div
            className="flex min-w-max gap-2"
            role="group"
            aria-label="Filter results by subject"
          >
            <Link
              href="/teacher"
              className={`pill ${!selectedSubject ? "pill-active" : "pill-inactive"}`}
              aria-current={!selectedSubject ? "true" : undefined}
            >
              Overall Results
            </Link>
            {availableSubjects.map((subject) => (
              <Link
                key={subject}
                href={`/teacher?subject=${encodeURIComponent(subject)}`}
                className={`pill ${
                  selectedSubject === subject ? "pill-active" : "pill-inactive"
                }`}
                aria-current={selectedSubject === subject ? "true" : undefined}
              >
                {subject}
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      {!hasEvaluations ? (
        <div className="card empty-state" role="status">
          <div className="empty-state-icon bg-navy-50 text-navy">
            <svg
              className="h-8 w-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <h2 className="empty-state-title">No evaluation results yet</h2>
          <p className="empty-state-text">
            {selectedSubject ? (
              <>
                There are no evaluations for{" "}
                <span className="font-semibold text-slate-700">{selectedSubject}</span>{" "}
                yet. Try another subject or the overall view.
              </>
            ) : (
              <>
                Once students submit their feedback, your performance summary, criteria
                breakdown and satisfaction chart will appear here.
              </>
            )}
          </p>
        </div>
      ) : (
        <>
          {/* Rating hero */}
          <div className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-navy to-navy-600 p-6 shadow-card sm:p-8">
            <div
              className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/5"
              aria-hidden="true"
            />
            <div
              className="absolute -right-2 top-16 h-24 w-24 rounded-full bg-gold-500/10"
              aria-hidden="true"
            />
            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-navy-200">
                  {selectedSubject
                    ? `Rating for ${selectedSubject}`
                    : "Overall Rating"}
                </p>
                <div className="flex flex-wrap items-end gap-4">
                  <span className="text-5xl font-black leading-none text-white">
                    {formatAverage(averageRating)}
                  </span>
                  <div className="pb-1">
                    <div
                      className="mb-1.5 flex text-gold-500"
                      role="img"
                      aria-label={
                        averageRating !== null
                          ? `${formatAverage(averageRating)} out of 5`
                          : "No rating"
                      }
                    >
                      {[0, 1, 2, 3, 4].map((index) => (
                        <svg
                          key={index}
                          className={`h-5 w-5 fill-current ${
                            index < fullStars ? "text-gold-500" : "text-white/25"
                          }`}
                          viewBox="0 0 20 20"
                          aria-hidden="true"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.381-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                    <span className="badge bg-gold-500/20 text-gold-100 ring-gold-500/40">
                      {band.label}
                    </span>
                  </div>
                </div>
              </div>
              <div className="lg:text-right">
                <p className="text-sm text-navy-100">
                  Based on{" "}
                  <span className="font-bold text-white">
                    {formatCount(totalEvaluations)}
                  </span>{" "}
                  {evaluationWord}
                </p>
                {selectedSubject && allTimeRating !== null ? (
                  <p className="mt-1 text-xs text-navy-200">
                    All-time average:{" "}
                    <span className="font-semibold text-white">
                      {formatAverage(allTimeRating)}
                    </span>
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          {/* KPI row */}
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="stat-card">
              <div>
                <p className="stat-label">Evaluations</p>
                <p className="stat-value">{formatCount(totalEvaluations)}</p>
                <p className="stat-meta">
                  {selectedSubject ? "for this subject" : "received in total"}
                </p>
              </div>
              <span className="stat-icon bg-navy-50 text-navy" aria-hidden="true">
                <svg
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
              </span>
            </div>

            <div className="stat-card">
              <div>
                <p className="stat-label">Subjects Evaluated</p>
                <p className="stat-value">{formatCount(subjectsEvaluated)}</p>
                <p className="stat-meta">with feedback</p>
              </div>
              <span
                className="stat-icon bg-success-50 text-success-600"
                aria-hidden="true"
              >
                <svg
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                  />
                </svg>
              </span>
            </div>

            <div className="stat-card">
              <div>
                <p className="stat-label">All-time Rating</p>
                <p className="stat-value">{formatAverage(allTimeRating)}</p>
                <p className="stat-meta">across all subjects</p>
              </div>
              <span className="stat-icon bg-gold-100 text-gold-700" aria-hidden="true">
                <svg
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                  />
                </svg>
              </span>
            </div>
          </div>

          {/* Criteria performance */}
          <section className="card mb-6 p-6 sm:p-8" aria-labelledby="breakdown-title">
            <div className="mb-6 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
              <h2
                id="breakdown-title"
                className="section-heading text-xl sm:text-2xl"
              >
                Performance Breakdown
                {selectedSubject ? (
                  <span className="block font-sans text-sm font-normal text-navy sm:inline sm:text-xl">
                    ({selectedSubject})
                  </span>
                ) : null}
              </h2>
              <div className="rounded-full bg-slate-50 px-3 py-1 text-xs font-bold uppercase tracking-widest text-slate-500">
                Based on {formatCount(totalEvaluations)} {evaluationWord}
              </div>
            </div>

            {hasCriteria && strongest && needsAttention ? (
              <>
                <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex items-start gap-3 rounded-xl border border-success-100 bg-success-50/60 p-4">
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-success-100 text-success-700"
                      aria-hidden="true"
                    >
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </span>
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-success-700/80">
                        Strongest Area
                      </p>
                      <p
                        className="truncate text-sm font-semibold text-slate-800"
                        title={strongest.label}
                      >
                        {strongest.label}
                      </p>
                      <p className="text-lg font-black leading-tight text-success-700">
                        {formatAverage(strongest.avg)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-xl border border-caution-100 bg-caution-50/60 p-4">
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-caution-100 text-caution-700"
                      aria-hidden="true"
                    >
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                        />
                      </svg>
                    </span>
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-caution-700/80">
                        Needs Attention
                      </p>
                      <p
                        className="truncate text-sm font-semibold text-slate-800"
                        title={needsAttention.label}
                      >
                        {needsAttention.label}
                      </p>
                      <p className="text-lg font-black leading-tight text-caution-700">
                        {formatAverage(needsAttention.avg)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-x-12 gap-y-7 lg:grid-cols-2">
                  {criteria.map((criterion) => {
                    const criterionBand = ratingBand(criterion.avg);
                    const percentage =
                      criterion.avg !== null ? (criterion.avg / 5) * 100 : 0;

                    return (
                      <div key={criterion.no} className="group">
                        <div className="mb-2 flex items-start justify-between gap-3">
                          <span className="text-sm font-medium leading-snug text-slate-700 transition-colors group-hover:text-navy">
                            <span className="font-bold text-slate-400">
                              {criterion.no}.
                            </span>{" "}
                            {criterion.label}
                          </span>
                          <div className="flex shrink-0 items-center gap-2">
                            <span className="text-base font-black leading-none text-slate-900">
                              {formatAverage(criterion.avg)}
                            </span>
                            <span
                              className={`badge ${criterionBand.badge} text-[10px]`}
                            >
                              {criterionBand.label}
                            </span>
                          </div>
                        </div>
                        <div
                          className="metric-track"
                          role="img"
                          aria-label={`${criterion.label}: ${
                            criterion.avg !== null
                              ? `${formatAverage(criterion.avg)} out of 5`
                              : "no data"
                          }`}
                        >
                          <div
                            className={`metric-fill ${criterionBand.bar}`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <p className="py-6 text-center text-sm text-slate-500">
                No criteria scores are available for this view yet.
              </p>
            )}
          </section>

          {/* Rating distribution */}
          <section className="card mb-6 p-6 sm:p-8" aria-labelledby="distribution-title">
            <div className="mb-6 flex items-center gap-3">
              <span
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy-50 text-navy"
                aria-hidden="true"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </span>
              <div>
                <h2 id="distribution-title" className="section-heading text-xl">
                  Overall Satisfaction Distribution
                </h2>
                <p className="section-subheading">How students rated their experience</p>
              </div>
            </div>
            <div className="relative h-[300px] w-full sm:h-[350px]">
              <SatisfactionChart
                buckets={distribution}
                totalEvaluations={totalEvaluations}
              />
            </div>
          </section>
        </>
      )}
    </>
  );
}
