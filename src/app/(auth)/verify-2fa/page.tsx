import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { VerifyForm } from "@/components/auth/verify-form";
import { LockIcon } from "@/components/icons";
import { maskEmail } from "@/lib/two-factor";
import {
  clearChallengeCookie,
  getPendingChallenge,
  isChallengeExpired,
} from "@/server/auth/challenge";

export const metadata: Metadata = { title: "Two-Factor Authentication" };
export const dynamic = "force-dynamic";

export default async function VerifyTwoFactorPage() {
  const challenge = await getPendingChallenge();
  if (!challenge) redirect("/login?error=2fa_session");

  if (isChallengeExpired(challenge)) {
    await clearChallengeCookie();
    redirect("/login?error=2fa_expired");
  }

  const masked =
    challenge.method === "email" && challenge.email ? maskEmail(challenge.email) : null;

  return (
    <div className="mx-auto w-full max-w-[400px]">
      <div className="auth-card">
        <div className="mb-6 flex flex-col items-center text-center sm:mb-7">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-navy-50 text-navy ring-4 ring-white/70">
            <LockIcon className="h-7 w-7" />
          </div>
          <h1 className="font-display text-xl font-bold text-navy sm:text-2xl">
            Two-Factor Authentication
          </h1>
          <div className="auth-rule" />
          <p className="text-sm text-slate-500">
            Enter the 6-digit code sent to your{" "}
            {challenge.method === "email" ? "email" : "authenticator app"}.
          </p>
          {masked ? (
            <p className="mt-1 text-xs font-semibold text-navy">{masked}</p>
          ) : null}
        </div>

        <VerifyForm
          method={challenge.method === "totp" ? "totp" : "email"}
          maskedEmail={masked}
        />

        <div className="mt-6 border-t border-slate-100 pt-5 text-center">
          <p className="text-[10px] uppercase tracking-widest text-slate-400">
            &copy; 2026 Andres Soriano Colleges of Bislig
          </p>
        </div>
      </div>
    </div>
  );
}
