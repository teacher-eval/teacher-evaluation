"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { AuthAlert, AuthNotice } from "@/components/auth/auth-shell";
import { PasswordField } from "@/components/auth/password-field";
import { resetPasswordAction, type AuthFormState } from "@/server/actions/auth";

const initialState: AuthFormState = {};

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState(resetPasswordAction, initialState);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const mismatch = confirmPassword.length > 0 && confirmPassword !== password;

  if (state.notice) {
    return (
      <>
        <AuthNotice message={state.notice} />
        <div className="mt-4 text-center">
          <Link
            href="/login"
            className="inline-block rounded-lg bg-navy px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-navy-700"
          >
            Sign in
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      {state.error ? <AuthAlert message={state.error} /> : null}

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="token" value={token} />

        <PasswordField
          name="password"
          label="New password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          showMeter
          hint="Use at least 8 characters. Longer passwords with mixed characters are stronger."
          onValueChange={setPassword}
        />

        <div>
          <PasswordField
            name="confirm_password"
            label="Confirm new password"
            autoComplete="new-password"
            placeholder="Re-enter your new password"
            onValueChange={setConfirmPassword}
          />
          {confirmPassword.length > 0 ? (
            <p
              className="password-match"
              data-state={mismatch ? "mismatch" : "match"}
              aria-live="polite"
            >
              {mismatch ? "Passwords do not match." : "Passwords match."}
            </p>
          ) : null}
        </div>

        <button type="submit" className="btn btn-primary btn-lg w-full" disabled={pending}>
          {pending ? "Resetting…" : "Reset Password"}
        </button>
      </form>

      <div className="mt-6 border-t border-slate-100 pt-5 text-center">
        <p className="text-sm text-slate-500">
          <Link
            href="/login"
            className="font-semibold text-navy underline-offset-2 hover:underline"
          >
            ← Back to sign in
          </Link>
        </p>
      </div>
    </>
  );
}
