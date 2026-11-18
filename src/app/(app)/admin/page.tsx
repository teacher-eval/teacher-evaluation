import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/layout/app-shell";
import { DateChip } from "@/components/layout/date-chip";
import { NavIcon } from "@/components/icons";
import { formatShortDate } from "@/lib/dates";
import { feelsBadge, formatCount } from "@/lib/ratings";
import { requireRole } from "@/lib/rbac";
import { getAdminDashboard } from "@/server/queries/admin-dashboard";

export const metadata: Metadata = { title: "Admin Dashboard" };
export const dynamic = "force-dynamic";
export const revalidate = 0;

const QUICK_ACTIONS = [
  {
    href: "/admin/teachers",
    label: "Manage teachers",
    tint: "bg-navy-50 text-navy",
    icon: "teachers",
  },
  {
    href: "/admin/students",
    label: "Manage students",
    tint: "bg-gold-100 text-gold-700",
    icon: "students",
  },
  {
    href: "/admin/courses",
    label: "Manage courses",
    tint: "bg-success-50 text-success-600",
    icon: "courses",
  },
  {
    href: "/admin/evaluation-settings",
    label: "Evaluation settings",
    tint: "bg-slate-100 text-slate-600",
    icon: "evaluation_settings",
  },
  {
    href: "/admin/reports",
    label: "View reports",
    tint: "bg-info-50 text-info-600",
    icon: "reports",
  },
] as const;

export default async function AdminDashboardPage() {
  const user = await requireRole("admin");
  const data = await getAdminDashboard();

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle={`Welcome back, ${user.fullName}`}
        actions={<DateChip />}
      />

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          href="/admin/teachers"
          label="Teachers"
          value={data.totalTeachers}
          meta="Manage accounts"
          iconClassName="bg-navy-50 text-navy"
          icon={<NavIcon name="teachers" className="h-6 w-6" />}
        />
        <StatCard
          href="/admin/students"
          label="Students"
          value={data.totalStudents}
          meta="Manage accounts"
          iconClassName="bg-gold-100 text-gold-700"
          icon={<NavIcon name="students" className="h-6 w-6" />}
        />
        <StatCard
          href="/admin/courses"
          label="Subjects"
          value={data.totalSubjects}
          meta="Courses & subjects"
          iconClassName="bg-success-50 text-success-600"
          icon={<NavIcon name="courses" className="h-6 w-6" />}
        />
        <StatCard
          href="/admin/reports"
          label="Evaluations"
          value={data.totalEvaluations}
          meta="View reports"
          iconClassName="bg-info-50 text-info-600"
          icon={
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
              />
            </svg>
          }
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="card overflow-hidden lg:col-span-2" aria-labelledby="recent-evals-title">
          <div className="card-header">
            <div>
              <h2 id="recent-evals-title" className="section-heading">
                Recent evaluations
              </h2>
              <p className="section-subheading">Latest student feedback submissions</p>
            </div>
            <Link
              href="/admin/reports"
              className="inline-flex items-center gap-1 text-sm font-semibold text-navy underline-offset-2 hover:underline"
            >
              View all
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </Link>
          </div>

          {data.recentEvaluations.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="data-table">
                <caption className="sr-only">
                  Most recent student evaluations, with date, teacher, subject and rating
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Date</th>
                    <th scope="col">Teacher</th>
                    <th scope="col">Subject</th>
                    <th scope="col">Rating</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentEvaluations.map((row) => {
                    const badge = feelsBadge(row.feels);
                    return (
                      <tr
                        key={`${row.date.toISOString()}-${row.teacherName}-${row.subject}-${row.feels}`}
                      >
                        <td className="whitespace-nowrap text-slate-500">
                          {formatShortDate(row.date)}
                        </td>
                        <td className="cell-primary">{row.teacherName}</td>
                        <td className="max-w-[220px] truncate text-slate-500">
                          {row.subject}
                        </td>
                        <td>
                          <span className={`badge ${badge.className}`}>
                            {badge.label}
                            {row.count > 1 ? (
                              <span className="ml-0.5 text-[10px] opacity-70">
                                ×{row.count}
                              </span>
                            ) : null}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state" role="status">
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
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <p className="empty-state-title">No evaluations yet</p>
              <p className="empty-state-text">
                Student feedback will appear here once the evaluation period opens.
              </p>
            </div>
          )}
        </section>

        <section className="card p-5 sm:p-6" aria-labelledby="quick-actions-title">
          <h2 id="quick-actions-title" className="section-heading">
            Quick actions
          </h2>
          <p className="section-subheading mb-5">Jump straight to common tasks</p>

          <div className="space-y-2">
            {QUICK_ACTIONS.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="group flex items-center gap-3 rounded-xl border border-slate-100 px-3.5 py-2.5 transition-colors hover:border-slate-200 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-500"
              >
                <span
                  className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${action.tint}`}
                  aria-hidden="true"
                >
                  <NavIcon name={action.icon} className="h-5 w-5" />
                </span>
                <span className="text-sm font-medium text-slate-700 transition-colors group-hover:text-slate-900">
                  {action.label}
                </span>
                <svg
                  className="ml-auto h-4 w-4 text-slate-300 transition-all group-hover:translate-x-0.5 group-hover:text-slate-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}

function StatCard({
  href,
  label,
  value,
  meta,
  iconClassName,
  icon,
}: {
  href: string;
  label: string;
  value: number;
  meta: string;
  iconClassName: string;
  icon: React.ReactNode;
}) {
  return (
    <Link href={href} className="stat-card">
      <div>
        <p className="stat-label">{label}</p>
        <p className="stat-value">{formatCount(value)}</p>
        <p className="stat-meta">{meta}</p>
      </div>
      <span className={`stat-icon ${iconClassName}`} aria-hidden="true">
        {icon}
      </span>
    </Link>
  );
}
