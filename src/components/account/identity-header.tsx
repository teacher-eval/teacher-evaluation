import Image from "next/image";

import { UserIcon } from "@/components/icons";
import { statusBadge } from "@/lib/status";

type IdentityHeaderProps = {
  fullName: string;
  username: string;
  status: string;
  department?: string | null;
  avatarUrl?: string | null;
  note?: string;
};

/**
 * Teacher account header: avatar, name, status pill and department.
 * Matches the PHP page, including the note that photos are admin-managed.
 */
export function IdentityHeader({
  fullName,
  username,
  status,
  department,
  avatarUrl,
  note,
}: IdentityHeaderProps) {
  const badge = statusBadge(status);
  const trimmedDepartment = department?.trim() ?? "";

  return (
    <section className="card mb-6 p-5 sm:p-6" aria-labelledby="identity-heading">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt=""
            width={80}
            height={80}
            className="h-20 w-20 shrink-0 rounded-full border-4 border-white object-cover shadow-md ring-1 ring-slate-200"
          />
        ) : (
          <div
            className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border-4 border-white bg-navy-100 text-3xl font-bold text-navy shadow-md ring-1 ring-slate-200"
            aria-hidden="true"
          >
            {(fullName || "T").charAt(0).toUpperCase()}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h2
              id="identity-heading"
              className="truncate font-display text-xl font-bold text-slate-900"
            >
              {fullName}
            </h2>
            <span className={badge.className}>{badge.label}</span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <UserIcon className="h-4 w-4 text-slate-400" />
              {username}
            </span>
            {trimmedDepartment ? (
              <span className="inline-flex items-center gap-1.5">
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
                    d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                {trimmedDepartment}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {note ? (
        <p className="mt-5 border-t border-slate-100 pt-4 text-xs text-slate-400">
          {note}
        </p>
      ) : null}
    </section>
  );
}
