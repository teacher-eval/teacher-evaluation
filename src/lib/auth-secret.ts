import { requireEnv } from "@/lib/env";

/**
 * The single signing key behind Auth.js sessions, login hand-off tokens,
 * 2FA challenge cookies and password-reset links.
 *
 * There is deliberately no fallback value. A default committed to the repo
 * would let anyone who can read the source forge a session or a login token
 * for any account, so a missing secret must fail loudly instead.
 */
export function authSecret(): string {
  const secret = requireEnv("AUTH_SECRET");
  if (secret.length < 32) {
    throw new Error(
      "AUTH_SECRET must be at least 32 characters. Generate one with `npx auth secret`.",
    );
  }
  return secret;
}
