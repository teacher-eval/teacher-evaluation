"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { AuthAlert } from "@/components/auth/auth-shell";
import { PasswordField } from "@/components/auth/password-field";
import { MailIcon, UserIcon } from "@/components/icons";
import { registerAction, type AuthFormState } from "@/server/actions/auth";

type Course = { courseCode: string; courseName: string };

const initialState: AuthFormState = {};

export function RegisterForm({ courses }: { courses: Course[] }) {
  const [state, formAction, pending] = useActionState(registerAction, initialState);
  const values = state.values ?? {};

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const mismatch = confirmPassword.length > 0 && confirmPassword !== password;

  return (
    <>
      {state.error ? <AuthAlert message={state.error} /> : null}

      <form action={formAction} className="space-y-4">
        <fieldset disabled={pending} className="space-y-4 disabled:opacity-80">
        <div>
          <label htmlFor="full_name" className="field-label">
            Full name
          </label>
          <div className="relative">
            <span className="input-icon left-3.5">
              <UserIcon className="h-4 w-4" />
            </span>
            <input
              type="text"
              id="full_name"
              name="full_name"
              defaultValue={values.full_name ?? ""}
              className="input pl-10"
              required
              autoComplete="name"
              placeholder="Enter your full name"
            />
          </div>
        </div>

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
              placeholder="Letters, numbers and underscores"
            />
          </div>
          <p className="field-hint">
            3–50 characters: letters, numbers and underscores only.
          </p>
        </div>

        <div>
          <label htmlFor="course" className="field-label">
            Course
          </label>
          <select
            id="course"
            name="course"
            className="select"
            defaultValue={values.course ?? ""}
            required
          >
            <option value="">Select course</option>
            {courses.map((course) => (
              <option key={course.courseCode} value={course.courseCode}>
                {course.courseCode} — {course.courseName}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="year_level" className="field-label">
            Year level
          </label>
          <select
            id="year_level"
            name="year_level"
            className="select"
            defaultValue={values.year_level ?? ""}
            required
          >
            <option value="">Select year level</option>
            <option value="1">1st Year</option>
            <option value="2">2nd Year</option>
            <option value="3">3rd Year</option>
          </select>
        </div>

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
              defaultValue={values.email ?? ""}
              className="input pl-10"
              required
              autoComplete="email"
              placeholder="your@gmail.com"
            />
          </div>
          <p className="field-hint">Used to send your two-factor verification codes.</p>
        </div>

        <PasswordField
          name="password"
          label="Password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          showMeter
          hint="Use at least 8 characters. Longer passwords with mixed characters are stronger."
          onValueChange={setPassword}
        />

        <div>
          <PasswordField
            name="confirm_password"
            label="Confirm password"
            autoComplete="new-password"
            placeholder="Re-enter your password"
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

        <div className="flex items-start gap-2.5">
          <input
            type="checkbox"
            id="agree_terms"
            name="agree_terms"
            required
            defaultChecked={values.agree_terms === "on"}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-navy focus:ring-navy-500"
          />
          <label htmlFor="agree_terms" className="text-xs leading-relaxed text-slate-600">
            I have read and agree to the{" "}
            <Link
              href="/terms"
              target="_blank"
              className="font-semibold text-navy underline-offset-2 hover:underline"
            >
              Terms of Service and Data Privacy Notice
            </Link>{" "}
            in compliance with RA 10173 (Data Privacy Act of 2012).
          </label>
        </div>
        </fieldset>

        {pending ? (
          <div className="flex items-center justify-center gap-2 rounded-xl bg-navy-50/70 py-2.5 px-3 text-xs font-medium text-navy">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-navy-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-navy-600" />
            </span>
            <span>Setting up account & sending verification code…</span>
          </div>
        ) : null}

        <button
          type="submit"
          className="btn btn-primary btn-lg mt-2 flex w-full items-center justify-center gap-2 font-medium disabled:cursor-not-allowed disabled:opacity-75"
          disabled={pending}
        >
          {pending ? (
            <>
              <svg
                className="h-5 w-5 animate-spin text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <span>Creating account…</span>
            </>
          ) : (
            "Create account"
          )}
        </button>
      </form>

      <div className="mt-6 border-t border-slate-100 pt-5 text-center">
        <p className="text-sm text-slate-500">
          Already have an account?{" "}
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
