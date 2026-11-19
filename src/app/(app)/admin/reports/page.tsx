import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/layout/app-shell";
import {
  PeriodFilter,
  ReportActions,
} from "@/components/admin/reports-controls";
import { TopTeachersChart } from "@/components/admin/top-teachers-chart";
import { formatDate } from "@/lib/dates";
import { requireRole } from "@/lib/rbac";
import {
  getAdminReportsData,
  getReportPeriods,
  selectPeriod,
  semesterLabel,
} from "@/server/queries/admin-reports";

export const metadata: Metadata = { title: "Evaluation Reports" };
export const dynamic = "force-dynamic";
export const revalidate = 0;

type SearchParams = Promise<{ period?: string | string[] }>;

const RATING_SCALE = [
  { value: 1, label: "Poor" },
  { value: 2, label: "Needs Improvement" },
  { value: 3, label: "Satisfactory" },
  { value: 4, label: "Very Satisfactory" },
  { value: 5, label: "Outstanding" },
];

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireRole("admin");
  const params = await searchParams;
  const requestedId =
    typeof params.period === "string" ? parseInt(params.period, 10) : Number.NaN;

  const periods = await getReportPeriods();
  const selectedPeriod = selectPeriod(
    periods,
    Number.isInteger(requestedId) ? requestedId : 0,
  );

  const range = selectedPeriod
    ? { start: selectedPeriod.startDate, end: selectedPeriod.endDate }
    : null;

  const data = await getAdminReportsData(range);

  const periodName = selectedPeriod
    ? `AY ${selectedPeriod.academicYear} · ${semesterLabel(selectedPeriod.semester)}`
    : "All evaluations";

  const periodDateLabel = selectedPeriod
    ? `${formatDate(selectedPeriod.startDate)} – ${formatDate(selectedPeriod.endDate)}`
    : "All recorded evaluations";

  const scopeTotal = data.ratingDistribution.reduce((sum, count) => sum + count, 0);
  const scopeTotalLabel = `${scopeTotal.toLocaleString()} ${
    scopeTotal === 1 ? "evaluation" : "evaluations"
  }`;

  const teacherCount = data.rows.length;
  const ratedTeacherCount = data.rows.filter((r) => r.totalEvaluations > 0).length;

  const periodOptions = periods.map((p) => ({
    id: p.id,
    label: `AY ${p.academicYear} · ${semesterLabel(p.semester)}`,
    status: p.status,
  }));

  const exportHref = selectedPeriod
    ? `/admin/reports/export?period=${selectedPeriod.id}`
    : `/admin/reports/export`;

  return (
    <>
      <PageHeader
        title="Evaluation Reports"
        subtitle="Teacher ratings for the selected evaluation period."
        actions={
          periods.length > 0 ? (
            <PeriodFilter
              periods={periodOptions}
              selectedId={selectedPeriod?.id ?? null}
            />
          ) : null
        }
      />

      {periods.length === 0 ? (
        <div className="alert alert-info mb-6" role="status">
          <svg
            className="mt-0.5 h-4 w-4 shrink-0"
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
          <span>
            No evaluation periods have been configured yet.{" "}
            <Link
              href="/admin/evaluation-settings"
              className="font-semibold underline underline-offset-2"
            >
              Create one
            </Link>{" "}
            to organise reports by period.
          </span>
        </div>
      ) : null}

      <div className="card overflow-hidden">
        {/* Period toolbar */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3 border-b border-slate-100 bg-slate-50/70 px-5 py-3">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-700">
              <svg
                className="h-4 w-4 text-slate-400"
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
              {periodDateLabel}
            </span>
            <span className="badge badge-neutral">{scopeTotalLabel}</span>
          </div>

          <ReportActions exportHref={exportHref} />
        </div>

        {/* Summary body */}
        <div className="p-5 sm:p-6" id="summary">
          {/* Top 5 highest rated teachers */}
          <div className="mb-8">
            <div className="mb-4">
              <h3 className="section-heading text-sm">Top 5 Highest Rated Teachers</h3>
              <p className="section-subheading">Average rating out of 5</p>
            </div>
            <div className="relative mx-auto h-60 w-full max-w-3xl">
              <TopTeachersChart teachers={data.topTeachers} />
            </div>
          </div>

          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="section-heading">Teacher Performance Summary</h2>
              <p className="section-subheading">
                {periodName} ·{" "}
                {teacherCount > 0
                  ? `${ratedTeacherCount} of ${teacherCount} teachers evaluated`
                  : "No active teachers"}
              </p>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-400">
              Rating scale:{" "}
              {RATING_SCALE.map((scale, i) => (
                <span key={scale.value}>
                  <span className="font-semibold text-slate-500">{scale.value}</span>{" "}
                  {scale.label}
                  {i < RATING_SCALE.length - 1 && (
                    <span className="mx-1 text-slate-300">·</span>
                  )}
                </span>
              ))}
            </p>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="data-table" id="summary-table">
              <caption className="sr-only">
                Teacher performance summary for {periodName}.
              </caption>
              <thead>
                <tr>
                  <th rowSpan={2} scope="col" className="align-bottom">
                    Teacher
                  </th>
                  <th rowSpan={2} scope="col" className="text-center align-bottom">
                    Evaluations
                  </th>
                  <th rowSpan={2} scope="col" className="text-center align-bottom">
                    Average
                  </th>
                  <th
                    colSpan={5}
                    scope="colgroup"
                    className="border-l border-slate-200 text-center"
                  >
                    Rating breakdown
                  </th>
                </tr>
                <tr>
                  {RATING_SCALE.map((scale) => (
                    <th
                      key={scale.value}
                      scope="col"
                      className={`text-center ${
                        scale.value === 1 ? "border-l border-slate-200" : ""
                      }`}
                      title={scale.label}
                    >
                      <span className="inline-flex items-center gap-0.5">
                        <span className="text-gold-500" aria-hidden="true">
                          ★
                        </span>
                        {scale.value}
                      </span>
                      <span className="sr-only">{scale.label}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.rows.length === 0 ? (
                  <tr>
                    <td colSpan={8}>
                      <div className="empty-state py-8" role="status">
                        <div className="empty-state-icon">
                          <svg
                            className="h-7 w-7"
                            aria-hidden="true"
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
                        </div>
                        <p className="empty-state-title">No active teachers to report</p>
                        <p className="empty-state-text">
                          Add teachers and collect evaluations to see the performance summary.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  data.rows.map((row) => {
                    const isRated = row.totalEvaluations > 0;
                    return (
                      <tr key={row.teacherName}>
                        <td
                          className={
                            isRated ? "cell-primary font-medium" : "text-slate-400"
                          }
                        >
                          {row.teacherName}
                        </td>
                        <td
                          className={`text-center ${
                            isRated ? "font-medium text-slate-700" : "text-slate-300"
                          }`}
                        >
                          {isRated ? row.totalEvaluations.toLocaleString() : "—"}
                        </td>
                        <td className="text-center">
                          {row.averageRating !== null ? (
                            <span className="badge badge-info">
                              {row.averageRating.toFixed(2)}/5
                            </span>
                          ) : (
                            <span className="text-xs font-medium text-slate-300">
                              —
                            </span>
                          )}
                        </td>
                        {row.ratings.map((count, idx) => (
                          <td
                            key={idx}
                            className={`text-center ${
                              idx === 0 ? "border-l border-slate-100" : ""
                            }`}
                          >
                            {count > 0 ? (
                              <span className="inline-flex min-w-6 items-center justify-center rounded-md bg-slate-100 px-1.5 py-0.5 text-xs font-semibold text-slate-700">
                                {count}
                              </span>
                            ) : (
                              <span className="text-slate-300" aria-hidden="true">
                                –
                              </span>
                            )}
                          </td>
                        ))}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
