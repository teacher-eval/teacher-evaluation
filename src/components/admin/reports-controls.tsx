"use client";

import { useRouter } from "next/navigation";
import { useEffect, useTransition } from "react";

/**
 * Interactive bits of the reports page: the auto-submitting period picker and
 * the export buttons.
 */

export type PeriodOption = {
  id: number;
  label: string;
  status: string;
};

export function PeriodFilter({
  periods,
  selectedId,
}: {
  periods: PeriodOption[];
  selectedId: number | null;
}) {
  const router = useRouter();

  return (
    <form
      className="items-end"
      onSubmit={(event) => event.preventDefault()}
      aria-label="Filter report by evaluation period"
    >
      <label
        htmlFor="periodFilter"
        className="field-label text-[11px] uppercase tracking-wider text-slate-500"
      >
        Evaluation period
      </label>
      <select
        id="periodFilter"
        name="period"
        className="select sm:w-72"
        value={selectedId ?? ""}
        onChange={(event) => {
          const value = event.target.value;
          router.push(value ? `/admin/reports?period=${value}` : "/admin/reports");
        }}
      >
        {periods.map((period) => (
          <option key={period.id} value={period.id}>
            {period.label} — {period.status}
          </option>
        ))}
      </select>
    </form>
  );
}

export function ReportActions({ exportHref }: { exportHref: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Auto-refresh when switching back to this window or tab
  useEffect(() => {
    function onFocus() {
      startTransition(() => {
        router.refresh();
      });
    }
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [router]);

  function handleRefresh() {
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <div className="no-print ml-auto flex items-center gap-2">
      <button
        type="button"
        onClick={handleRefresh}
        disabled={isPending}
        className="btn btn-secondary btn-sm text-slate-700 hover:bg-slate-100"
        title="Refresh latest evaluation data"
      >
        <svg
          className={`h-4 w-4 ${isPending ? "animate-spin text-navy" : "text-slate-500"}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
        <span>{isPending ? "Refreshing..." : "Refresh"}</span>
      </button>
      <a
        href={exportHref}
        download
        className="btn btn-secondary btn-sm border-success-600/30 text-success-700 hover:bg-success-50"
      >
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
            d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        Excel
      </a>
      <button
        type="button"
        onClick={() => window.print()}
        className="btn btn-secondary btn-sm border-danger-600/30 text-danger-700 hover:bg-danger-50"
      >
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
            d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
          />
        </svg>
        PDF
      </button>
    </div>
  );
}
