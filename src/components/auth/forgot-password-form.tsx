"use client";

import Link from "next/link";
import { useActionState } from "react";

import { AuthAlert, AuthNotice } from "@/components/auth/auth-shell";
import { MailIcon, UserIcon } from "@/components/icons";
import { forgotPasswordAction, type AuthFormState } from "@/server/actions/auth";

const initialState: AuthFormState = {};

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(forgotPasswordAction, initialState);
  const values = state.values ?? {};

  // After a successful submission, show the success message only.
  if (state.notice) {
    return (
      <>
        <AuthNotice message={state.notice} />
        <div className="mt-4 text-center">
          <Link
            href="/login"
            className="text-sm font-semibold text-navy underline-offset-2 hover:underline"
          >
            ← Back to sign in
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      {state.error ? <AuthAlert message={state.error} /> : null}

      <form action={formAction} className="space-y-4">
        <div>
          <label htmlFor="username" className="field-label">
            Username
          </label>
          <div className="relative">
            <span className="input-icon left-3.5">
              <UserIcon className="h-4 w-4" />
            </span>
            <input
              type="text"
              id="username"
              name="username"
              defaultValue={values.username ?? ""}
              className="input pl-10"
              required
              autoComplete="username"
              placeholder="Enter your username"
            />
          </div>
        </div>

        <div>
          <label htmlFor="email" className="field-label">
            Email address
          </label>
          <div className="relative">
            <span className="input-icon left-3.5">
              <MailIcon className="h-4 w-4" />
            </span>
            <input
              type="email"
              id="email"
              name="email"
              defaultValue={values.email ?? ""}
              className="input pl-10"
              required
              autoComplete="email"
              placeholder="Enter your registered email"
            />
          </div>
          <p className="field-hint">The email address linked to your account.</p>
        </div>

        <button type="submit" className="btn btn-primary btn-lg w-full" disabled={pending}>
          {pending ? "Sending…" : "Send Reset Link"}
        </button>
      </form>

      <div className="mt-6 border-t border-slate-100 pt-5 text-center">
        <p className="text-sm text-slate-500">
          Remember your password?{" "}
          <Link
            href="/login"
            className="font-semibold text-navy underline-offset-2 hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </>
  );
}
