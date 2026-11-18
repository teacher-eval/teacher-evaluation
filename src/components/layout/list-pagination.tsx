import Link from "next/link";

import { paginationRange } from "@/lib/pagination";

/**
 * Numbered pagination footer shared by the admin list screens. Matches the
 * markup in frontend/views/admin/*.php: the summary line plus previous/number/
 * next controls, with the legacy delta window around the current page.
 */
export function ListPagination({
  page,
  totalPages,
  totalRecords,
  hrefFor,
}: {
  page: number;
  totalPages: number;
  totalRecords: number;
  hrefFor: (page: number) => string;
}) {
  return (
    <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-card sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <p className="text-center text-sm text-slate-600 sm:text-left">
        Showing page <span className="font-semibold text-slate-900">{page}</span> of{" "}
        <span className="font-semibold text-slate-900">{totalPages}</span>{" "}
        <span className="text-slate-400">({totalRecords} total results)</span>
      </p>
      <nav
        className="flex flex-wrap items-center justify-center gap-1"
        aria-label="Pagination"
      >
        {page <= 1 ? (
          <span
            className="icon-btn pointer-events-none border border-slate-200 opacity-40"
            aria-disabled="true"
          >
            <PaginationChevron direction="previous" />
          </span>
        ) : (
          <Link
            href={hrefFor(page - 1)}
            className="icon-btn border border-slate-200"
            aria-label="Previous page"
          >
            <PaginationChevron direction="previous" />
          </Link>
        )}

        {paginationRange(page, totalPages).map((item, index) =>
          item === "..." ? (
            <span
              key={`gap-${index}`}
              className="px-1.5 text-sm text-slate-400"
              aria-hidden="true"
            >
              …
            </span>
          ) : (
            <Link
              key={item}
              href={hrefFor(item)}
              className={`inline-flex h-11 min-w-[2.75rem] items-center justify-center rounded-lg px-3 text-sm font-semibold transition-colors ${
                page === item
                  ? "bg-navy text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
              aria-current={page === item ? "page" : undefined}
            >
              {item}
            </Link>
          ),
        )}

        {page >= totalPages ? (
          <span
            className="icon-btn pointer-events-none border border-slate-200 opacity-40"
            aria-disabled="true"
          >
            <PaginationChevron direction="next" />
          </span>
        ) : (
          <Link
            href={hrefFor(page + 1)}
            className="icon-btn border border-slate-200"
            aria-label="Next page"
          >
            <PaginationChevron direction="next" />
          </Link>
        )}
      </nav>
    </div>
  );
}

function PaginationChevron({ direction }: { direction: "previous" | "next" }) {
  const path =
    direction === "previous"
      ? "M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z"
      : "M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z";

  return (
    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d={path} clipRule="evenodd" />
    </svg>
  );
}
