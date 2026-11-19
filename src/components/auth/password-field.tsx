"use client";

import { useId, useState } from "react";

import { EyeIcon, EyeOffIcon } from "@/components/icons";
import {
  passwordStrength,
  strengthLabel,
  strengthLevel,
} from "@/lib/password";

type PasswordFieldProps = {
  name: string;
  label: string;
  autoComplete: string;
  defaultValue?: string;
  placeholder?: string;
  hint?: string;
  showMeter?: boolean;
  required?: boolean;
  /** Lets a parent compare this field against another (e.g. confirm password). */
  onValueChange?: (value: string) => void;
};

export function PasswordField({
  name,
  label,
  autoComplete,
  defaultValue = "",
  placeholder,
  hint,
  showMeter = false,
  required = true,
  onValueChange,
}: PasswordFieldProps) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  const [value, setValue] = useState(defaultValue);

  const level = strengthLevel(passwordStrength(value));
  const showStrength = showMeter && value.length > 0;

  return (
    <div>
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          defaultValue={defaultValue}
          onChange={(event) => {
            setValue(event.target.value);
            onValueChange?.(event.target.value);
          }}
          className="input pr-11"
          autoComplete={autoComplete}
          placeholder={placeholder}
          required={required}
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          title={visible ? "Hide password" : "Show password"}
          className="absolute right-1.5 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-500"
        >
          {visible ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
        </button>
      </div>

      {showStrength ? (
        <div className="password-meter mt-2" data-strength={level} aria-live="polite">
          <div className="password-meter-track">
            <div className="password-meter-bar" />
          </div>
          <span className="password-meter-label">{strengthLabel(level)}</span>
        </div>
      ) : null}

      {hint ? <p className="field-hint">{hint}</p> : null}
    </div>
  );
}
