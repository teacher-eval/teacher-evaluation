"use client";

import Link from "next/link";
import { useActionState } from "react";

import { AuthAlert } from "@/components/auth/auth-shell";
import { PasswordField } from "@/components/auth/password-field";
import { UserIcon } from "@/components/icons";
import { loginAction, type AuthFormState } from "@/server/actions/auth";

const initialState: AuthFormState = {};

const ROLES = [
  { value: "student", label: "Student" },
  { value: "teacher", label: "Teacher" },
  { value: "admin", label: "Admin" },
] as const;

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <>
      {state.error ? <AuthAlert message={state.error} /> : null}

      <form action={formAction} className="space-y-5">
        <fieldset>
          <legend className="mb-1.5 block text-sm font-medium text-slate-700">
            Select role
          </legend>
          <div className="flex gap-2">
            {ROLES.map((role) => (
              <label key={role.value} className="role-option">
                <input
                  type="radio"
                  name="role"
                  value={role.value}
                  defaultChecked={(state.values?.role ?? "student") === role.value}
                  required
                />
                <span>{role.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

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
              className="input pl-10"
              defaultValue={state.values?.username ?? ""}
              required
              autoComplete="username"
              placeholder="Enter your username"
            />
          </div>
        </div>

        <PasswordField
          name="password"
          label="Password"
          autoComplete="current-password"
          placeholder="Enter your password"
        />

        <button type="submit" className="btn btn-primary btn-lg w-full" disabled={pending}>
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <div className="mt-6 border-t border-slate-100 pt-5 text-center">
        <p className="text-sm text-slate-500">
          New student?{" "}
          <Link
            href="/register"
            className="font-semibold text-navy underline-offset-2 hover:underline"
          >
            Create an account
          </Link>
        </p>
      </div>
    </>
  );
}
