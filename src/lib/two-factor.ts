import { randomInt } from "node:crypto";

import bcrypt from "bcryptjs";
import { generateSecret, generateURI, verifySync } from "otplib";

import { APP_NAME } from "@/lib/env";
import { sendMail } from "@/lib/mail";

export const TWO_FACTOR_CODE_TTL_SECONDS = 5 * 60;
export const TWO_FACTOR_RESEND_COOLDOWN_SECONDS = 30;
export const TWO_FACTOR_MAX_ATTEMPTS = 5;

export function generateEmailCode(): string {
  return String(randomInt(100_000, 1_000_000));
}

export async function hashOtp(code: string): Promise<string> {
  return bcrypt.hash(code, 10);
}

export async function verifyOtp(code: string, hash: string): Promise<boolean> {
  return bcrypt.compare(code, hash);
}

/**
 * Masks an address for display: `juan.dela@example.com` -> `j***a@e***e.com`.
 * Ported from maskEmailAddress() so the verification screen reads the same.
 */
export function maskEmail(email: string): string {
  const at = email.indexOf("@");
  if (at === -1) return "***";

  const local = email.slice(0, at);
  const domain = email.slice(at + 1);

  const maskedLocal =
    local.length <= 2
      ? "*".repeat(Math.max(1, local.length))
      : `${local.slice(0, 1)}${"*".repeat(Math.max(1, local.length - 2))}${local.slice(-1)}`;

  const parts = domain.split(".");
  const name = parts.shift() ?? "";
  const maskedName =
    name.length <= 2
      ? `${name.slice(0, 1)}*`
      : `${name.slice(0, 1)}${"*".repeat(Math.max(1, name.length - 2))}${name.slice(-1)}`;

  return `${maskedLocal}@${[maskedName, ...parts].join(".")}`;
}

export function createTotpSecret(): string {
  return generateSecret();
}

export function verifyTotp(secret: string, code: string): boolean {
  const digits = code.replace(/\D/g, "");
  if (digits.length !== 6) return false;

  // ±30 s, matching the PHP helper's window of 1 time step.
  return verifySync({ secret, token: digits, epochTolerance: 30 }).valid;
}

export function totpProvisioningUri(username: string, secret: string): string {
  return generateURI({ issuer: APP_NAME, label: username, secret });
}

export async function sendTwoFactorEmail(
  email: string,
  code: string,
  username: string,
): Promise<boolean> {
  const minutes = Math.round(TWO_FACTOR_CODE_TTL_SECONDS / 60);

  const result = await sendMail({
    to: email,
    subject: `${APP_NAME} verification code`,
    text: [
      `Hello ${username},`,
      "",
      `Your ${APP_NAME} verification code is: ${code}`,
      "",
      `This code expires in ${minutes} minutes.`,
      "",
      "If you did not try to sign in, please change your password immediately.",
    ].join("\n"),
    html: `
      <h3>Hello ${escapeHtml(username)},</h3>
      <p>Your <strong>${escapeHtml(APP_NAME)}</strong> verification code is:
        <span style="font-size:24px;font-weight:bold;color:#2563eb;letter-spacing:5px">${code}</span>
      </p>
      <p>This code expires in ${minutes} minutes.</p>
      <p>If you did not try to sign in, please change your password immediately.</p>
      <hr>
      <p style="font-size:10px;color:#666">&copy; 2026 Andres Soriano Colleges of Bislig</p>
    `,
  });

  return result.ok;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
