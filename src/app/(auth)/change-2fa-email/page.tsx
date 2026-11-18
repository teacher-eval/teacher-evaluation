import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { ChangeEmailForm } from "@/components/auth/change-email-form";
import { MailIcon } from "@/components/icons";
import {
  clearChallengeCookie,
  getPendingChallenge,
  isChallengeExpired,
} from "@/server/auth/challenge";

export const metadata: Metadata = { title: "Change 2FA Email" };
export const dynamic = "force-dynamic";

export default async function ChangeTwoFactorEmailPage() {
  const challenge = await getPendingChallenge();
  if (!challenge) redirect("/login?error=2fa_session");

  if (isChallengeExpired(challenge)) {
    await clearChallengeCookie();
    redirect("/login?error=2fa_expired");
  }

  return (
    <div className="mx-auto w-full max-w-[400px]">
      <div className="auth-card">
        <div className="mb-6 flex flex-col items-center text-center sm:mb-7">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-navy-50 text-navy ring-4 ring-white/70">
            <MailIcon className="h-7 w-7" />
          </div>
          <h1 className="font-display text-xl font-bold text-navy sm:text-2xl">
            Change Gmail Address
          </h1>
          <div className="auth-rule" />
          <p className="text-sm text-slate-500">
            Enter the address that should receive your verification code.
          </p>
        </div>

        <ChangeEmailForm />

        <div className="mt-6 border-t border-slate-100 pt-5 text-center">
          <p className="text-[10px] uppercase tracking-widest text-slate-400">
            &copy; 2026 Andres Soriano Colleges of Bislig
          </p>
        </div>
      </div>
    </div>
  );
}
