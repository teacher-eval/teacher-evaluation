import type { SVGProps } from "react";

import type { NavKey } from "@/lib/nav";

/**
 * Icon path data lifted from the legacy PHP sidebar so the navigation looks
 * identical. Each entry is one or more <path d="..."> values.
 */
const NAV_PATHS: Record<NavKey, string[]> = {
  dashboard: [
    "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
  ],
  teachers: [
    "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z",
  ],
  students: [
    "M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z",
  ],
  courses: [
    "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.084.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.084.477-4.5 1.253",
  ],
  reports: [
    "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
  ],
  evaluation_form: [
    "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
  ],
  evaluation_settings: [
    "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z",
    "M15 12a3 3 0 11-6 0 3 3 0 016 0z",
  ],
  account_settings: [
    "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
  ],
};

type IconProps = SVGProps<SVGSVGElement> & { className?: string };

function StrokeIcon({ paths, className, ...props }: IconProps & { paths: string[] }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
      {...props}
    >
      {paths.map((d) => (
        <path
          key={d}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d={d}
        />
      ))}
    </svg>
  );
}

export function NavIcon({ name, className }: { name: NavKey; className?: string }) {
  return <StrokeIcon paths={NAV_PATHS[name]} className={className} />;
}

export function ShieldIcon({ className }: IconProps) {
  return (
    <StrokeIcon
      className={className}
      paths={[
        "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
      ]}
    />
  );
}

export function LogoutIcon({ className }: IconProps) {
  return (
    <StrokeIcon
      className={className}
      paths={[
        "M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1",
      ]}
    />
  );
}

export function MenuIcon({ className }: IconProps) {
  return <StrokeIcon className={className} paths={["M4 6h16M4 12h16M4 18h16"]} />;
}

export function CloseIcon({ className }: IconProps) {
  return <StrokeIcon className={className} paths={["M6 18L18 6M6 6l12 12"]} />;
}

export function ChevronLeftIcon({ className }: IconProps) {
  return <StrokeIcon className={className} paths={["M15 19l-7-7 7-7"]} />;
}

export function CalendarIcon({ className }: IconProps) {
  return (
    <StrokeIcon
      className={className}
      paths={["M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"]}
    />
  );
}

export function UserIcon({ className }: IconProps) {
  return (
    <StrokeIcon
      className={className}
      paths={[
        "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
      ]}
    />
  );
}

export function LockIcon({ className }: IconProps) {
  return (
    <StrokeIcon
      className={className}
      paths={[
        "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z",
      ]}
    />
  );
}

export function MailIcon({ className }: IconProps) {
  return (
    <StrokeIcon
      className={className}
      paths={[
        "M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207",
      ]}
    />
  );
}

export function EyeIcon({ className }: IconProps) {
  return (
    <StrokeIcon
      className={className}
      paths={[
        "M15 12a3 3 0 11-6 0 3 3 0 016 0z",
        "M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z",
      ]}
    />
  );
}

export function EyeOffIcon({ className }: IconProps) {
  return (
    <StrokeIcon
      className={className}
      paths={[
        "M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21",
      ]}
    />
  );
}

export function AlertIcon({ className }: IconProps) {
  return (
    <StrokeIcon
      className={className}
      paths={[
        "M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
      ]}
    />
  );
}

export function CheckIcon({ className }: IconProps) {
  return <StrokeIcon className={className} paths={["M5 13l4 4L19 7"]} />;
}

export function ArrowLeftIcon({ className }: IconProps) {
  return <StrokeIcon className={className} paths={["M10 19l-7-7m0 0l7-7m-7 7h18"]} />;
}

export function PlusIcon({ className }: IconProps) {
  return <StrokeIcon className={className} paths={["M12 4v16m8-8H4"]} />;
}

export function TrashIcon({ className }: IconProps) {
  return (
    <StrokeIcon
      className={className}
      paths={[
        "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16",
      ]}
    />
  );
}
