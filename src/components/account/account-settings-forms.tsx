"use client";

import { useActionState, useState } from "react";

import { EyeIcon, EyeOffIcon, LockIcon, UserIcon } from "@/components/icons";
import {
  passwordStrength,
  strengthLabel,
  strengthLevel,
} from "@/lib/password";
import {
  changePasswordAction,
  updateProfileAction,
  type AccountFormState,
} from "@/server/actions/account";

const initialState: AccountFormState = {};

type Props = {
  fullName: string;
  username: string;
};

/**
 * Both cards share one client boundary so a single flash message can summarize
 * whichever action ran, matching the PHP page's one-alert-at-the-top layout.
 */
export function AccountSettingsForms({ fullName, username }: Props) {
  const [profileState, profileAction, savingProfile] = useActionState(
    updateProfileAction,
    initialState,
  );
  const [passwordState, passwordAction, savingPassword] = useActionState(
    changePasswordAction,
    initialState,
  );

  const success = profileState.success ?? passwordState.success;
  const error = profileState.error ?? passwordState.error;

  return (
    <>
      {success ? (
        <div className="alert alert-success mb-6" role="status">
          <svg
            className="mt-0.5 h-5 w-5 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span className="flex-1">{success}</span>
        </div>
      ) : null}

      {error ? (
        <div className="alert alert-error mb-6" role="alert">
          <svg
            className="mt-0.5 h-5 w-5 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
            />
          </svg>
          <span className="flex-1">{error}</span>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Profile */}
        <section className="card" aria-labelledby="profile-heading">
          <div className="card-header">
            <div className="flex items-center gap-3">
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy-50 text-navy"
                aria-hidden="true"
              >
                <UserIcon className="h-5 w-5" />
              </span>
              <div>
                <h2 id="profile-heading" className="section-heading">
                  Profile Information
                </h2>
                <p className="section-subheading">
                  How your name appears across the system.
                </p>
              </div>
            </div>
          </div>

          <form action={profileAction} className="card-body space-y-5">
            <div>
              <label htmlFor="full_name" className="field-label">
                Full name
              </label>
              <input
                type="text"
                id="full_name"
                name="full_name"
                defaultValue={
                  profileState.values?.fullName ?? fullName
                }
                className="input"
                autoComplete="name"
                maxLength={100}
                required
              />
            </div>

            <div>
              <label htmlFor="username" className="field-label">
                Username
              </label>
              <input
                type="text"
                id="username"
                name="username"
                defaultValue={
                  profileState.values?.username ?? username
                }
                className="input"
                autoComplete="username"
                maxLength={50}
                minLength={3}
                pattern="[A-Za-z0-9_]+"
                required
              />
              <p className="field-hint">Used to sign in. Must be unique.</p>
            </div>

            <div className="pt-1">
              <button
                type="submit"
                className="btn btn-primary w-full sm:w-auto"
                disabled={savingProfile}
              >
                {savingProfile ? "Saving…" : "Save changes"}
              </button>
            </div>
          </form>
        </section>

        {/* Password */}
        <section className="card" aria-labelledby="password-heading">
          <div className="card-header">
            <div className="flex items-center gap-3">
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy-50 text-navy"
                aria-hidden="true"
              >
                <LockIcon className="h-5 w-5" />
              </span>
              <div>
                <h2 id="password-heading" className="section-heading">
                  Change Password
                </h2>
                <p className="section-subheading">
                  At least 8 characters. A mix of letters, numbers and symbols is
                  stronger.
                </p>
              </div>
            </div>
          </div>

          <PasswordForm action={passwordAction} pending={savingPassword} />
        </section>
      </div>
    </>
  );
}

function PasswordForm({
  action,
  pending,
}: {
  action: (formData: FormData) => void;
  pending: boolean;
}) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const level = strengthLevel(passwordStrength(newPassword));
  const showMeter = newPassword.length > 0;
  const mismatch = confirmPassword.length > 0 && confirmPassword !== newPassword;

  return (
    <form action={action} className="card-body space-y-5">
      <PasswordInput
        id="current_password"
        name="current_password"
        label="Current password"
        autoComplete="current-password"
      />

      <div className="border-t border-slate-100 pt-5">
        <PasswordInput
          id="new_password"
          name="new_password"
          label="New password"
          autoComplete="new-password"
          minLength={8}
          ariaDescribedBy="pw-strength"
          onValueChange={setNewPassword}
        />
        <div
          className="password-meter"
          id="pw-strength"
          data-strength={showMeter ? level : 0}
          aria-live="polite"
        >
          <div className="password-meter-track">
            <div className="password-meter-bar" />
          </div>
          <span className="password-meter-label">
            {showMeter ? strengthLabel(level) : "Enter a password"}
          </span>
        </div>
      </div>

      <div>
        <PasswordInput
          id="confirm_password"
          name="confirm_password"
          label="Confirm new password"
          autoComplete="new-password"
          minLength={8}
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

      <div className="pt-1">
        <button
          type="submit"
          className="btn btn-primary w-full sm:w-auto"
          disabled={pending}
        >
          {pending ? "Updating…" : "Update password"}
        </button>
      </div>
    </form>
  );
}

function PasswordInput({
  id,
  name,
  label,
  autoComplete,
  minLength,
  ariaDescribedBy,
  onValueChange,
}: {
  id: string;
  name: string;
  label: string;
  autoComplete: string;
  minLength?: number;
  ariaDescribedBy?: string;
  onValueChange?: (value: string) => void;
}) {
  const [visible, setVisible] = useState(false);
  const toggleLabel = visible ? "Hide password" : "Show password";

  return (
    <div>
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      <div className="relative">
        <input
          type={visible ? "text" : "password"}
          id={id}
          name={name}
          className="input pr-11"
          autoComplete={autoComplete}
          minLength={minLength}
          aria-describedby={ariaDescribedBy}
          onChange={
            onValueChange
              ? (event) => onValueChange(event.target.value)
              : undefined
          }
          required
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl text-slate-400 transition-colors hover:text-navy focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-navy-500"
          aria-label={toggleLabel}
          aria-pressed={visible}
          title={toggleLabel}
        >
          {visible ? <EyeOffIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
        </button>
      </div>
    </div>
  );
}
