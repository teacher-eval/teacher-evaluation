"use client";

import Link from "next/link";
import { useActionState } from "react";

import { AuthAlert, AuthNotice } from "@/components/auth/auth-shell";
import { resendCodeAction, verifyTwoFactorAction, type AuthFormState } from "@/server/actions/auth";

const initialState: AuthFormState = {};

export function VerifyForm({
  method,
  maskedEmail,
}: {
  method: "email" | "totp";
  maskedEmail: string | null;
}) {
  const [state, formAction, pending] = useActionState(verifyTwoFactorAction, initialState);
  const [resendState, resendAction, resending] = useActionState(
    resendCodeAction,
    initialState,
  );

  return (
    <>
      {state.error ? <AuthAlert message={state.error} /> : null}
      {resendState.notice ? <AuthNotice message={resendState.notice} /> : null}
      {resendState.error ? <AuthAlert message={resendState.error} /> : null}

      <form action={formAction}>
        <div>
          <label htmlFor="otp-input" className="field-label">
            Verification code
          </label>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            name="code"
            id="otp-input"
            className="input otp-input"
            required
            autoFocus
            autoComplete="one-time-code"
            placeholder="000000"
            aria-describedby="otp-help"
            onChange={(event) => {
              event.target.value = event.target.value.replace(/[^0-9]/g, "").slice(0, 6);
            }}
          />
          <p id="otp-help" className="field-hint text-center">
            {method === "email"
              ? "Check your inbox and spam folder. Codes expire after a few minutes."
              : "Open your authenticator app and enter the current 6-digit code."}
          </p>
        </div>

        <button type="submit" className="btn btn-primary btn-lg mt-5 w-full" disabled={pending}>
          {pending ? "Verifying…" : "Verify code"}
        </button>
      </form>

      <div className="mt-5 flex flex-col gap-2 text-center">
        {method === "email" ? (
          <>
            <form action={resendAction}>
              <button
                type="submit"
                className="text-xs font-medium text-navy underline-offset-2 hover:underline disabled:opacity-50"
                disabled={resending}
              >
                {resending ? "Sending…" : "Resend code"}
              </button>
            </form>
            <Link
              href="/change-2fa-email"
              className="text-xs font-medium text-navy underline-offset-2 hover:underline"
            >
              Change your Gmail address?
            </Link>
          </>
        ) : null}
        <Link
          href="/login"
          className="text-xs text-slate-500 underline-offset-2 hover:text-navy hover:underline"
        >
          Back to sign in
        </Link>
      </div>

      {maskedEmail ? (
        <p className="mt-4 text-center text-xs font-semibold text-navy">{maskedEmail}</p>
      ) : null}
    </>
  );
}
