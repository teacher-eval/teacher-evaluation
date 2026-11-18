"use client";

import Link from "next/link";
import { useActionState } from "react";

import { AuthAlert } from "@/components/auth/auth-shell";
import { MailIcon } from "@/components/icons";
import {
  changeTwoFactorEmailAction,
  type AuthFormState,
} from "@/server/actions/auth";

const initialState: AuthFormState = {};

export function ChangeEmailForm() {
  const [state, formAction, pending] = useActionState(
    changeTwoFactorEmailAction,
    initialState,
  );

  return (
    <>
      {state.error ? <AuthAlert message={state.error} /> : null}

      <form action={formAction}>
        <div>
          <label htmlFor="email" className="field-label">
            Gmail address
          </label>
          <div className="relative">
            <span className="input-icon left-3.5">
              <MailIcon className="h-4 w-4" />
            </span>
            <input
              type="email"
              id="email"
              name="email"
              className="input pl-10"
              defaultValue={state.values?.email ?? ""}
              required
              autoComplete="email"
              placeholder="your@gmail.com"
            />
          </div>
          <p className="field-hint">A fresh verification code will be sent to this address.</p>
        </div>

        <button type="submit" className="btn btn-primary btn-lg mt-5 w-full" disabled={pending}>
          {pending ? "Updating…" : "Send new code"}
        </button>

        <div className="mt-5 text-center">
          <Link
            href="/verify-2fa"
            className="text-xs text-slate-500 underline-offset-2 hover:text-navy hover:underline"
          >
            Back to verification
          </Link>
        </div>
      </form>
    </>
  );
}
