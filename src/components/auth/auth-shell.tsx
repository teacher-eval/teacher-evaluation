import Image from "next/image";

type AuthHeaderProps = {
  title: string;
  subtitle: string;
  note?: string;
};

export function AuthHeader({ title, subtitle, note }: AuthHeaderProps) {
  return (
    <div className="mb-6 flex flex-col items-center text-center sm:mb-7">
      <div className="auth-logo mb-4">
        <Image
          src="/logo.webp"
          alt="Andres Soriano Colleges of Bislig logo"
          width={56}
          height={56}
          className="h-10 w-10 object-contain sm:h-14 sm:w-14"
          priority
        />
      </div>
      <h1 className="font-display text-xl font-bold text-navy sm:text-2xl">{title}</h1>
      <div className="auth-rule" />
      <p className="text-sm text-slate-500">{subtitle}</p>
      {note ? (
        <p className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          {note}
        </p>
      ) : null}
    </div>
  );
}

export function AuthFooter({ children }: { children?: React.ReactNode }) {
  return (
    <div className="mt-6 border-t border-slate-100 pt-5 text-center">
      {children}
      <p className="mt-3 text-[10px] text-slate-400">
        &copy; 2026 Andres Soriano Colleges of Bislig
      </p>
    </div>
  );
}

export function AuthAlert({ message }: { message: string }) {
  return (
    <div className="alert alert-error mb-5" role="alert" tabIndex={-1}>
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
          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <span>{message}</span>
    </div>
  );
}

export function AuthNotice({ message }: { message: string }) {
  return (
    <div className="alert alert-success mb-5" role="status">
      <svg
        className="mt-0.5 h-4 w-4 flex-shrink-0"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
      <span>{message}</span>
    </div>
  );
}
