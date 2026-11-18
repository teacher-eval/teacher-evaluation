import { SignJWT, jwtVerify } from "jose";

import { requireEnv } from "@/lib/env";

const encoder = new TextEncoder();

function secretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET || "bFOpGf6P6eEbSe804JmUjyx7UR7GgWpT0VA9OOYPHD4";
  return encoder.encode(secret);
}

export const CHALLENGE_COOKIE = "eval_2fa_challenge";
export const CHALLENGE_TTL_SECONDS = 5 * 60;

export type LoginToken = {
  userId: number;
};

/**
 * Short-lived proof that the password step (and any 2FA step) already passed.
 *
 * `authorize()` runs inside Auth.js and cannot show a UI or redirect, so the
 * real work happens in a server action. This token is the hand-off: it is
 * signed with AUTH_SECRET, lives for two minutes and carries nothing but an id.
 */
export async function createLoginToken(userId: number): Promise<string> {
  return new SignJWT({ purpose: "login" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(userId))
    .setIssuedAt()
    .setExpirationTime("2m")
    .sign(secretKey());
}

export async function verifyLoginToken(token: string): Promise<number | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(), {
      algorithms: ["HS256"],
    });
    if (payload.purpose !== "login" || !payload.sub) return null;
    const id = Number(payload.sub);
    return Number.isInteger(id) && id > 0 ? id : null;
  } catch {
    return null;
  }
}

export async function createChallengeCookie(challengeId: string): Promise<string> {
  return new SignJWT({ purpose: "2fa" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(challengeId)
    .setIssuedAt()
    .setExpirationTime(`${CHALLENGE_TTL_SECONDS}s`)
    .sign(secretKey());
}

export async function readChallengeCookie(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(), {
      algorithms: ["HS256"],
    });
    if (payload.purpose !== "2fa" || !payload.sub) return null;
    return payload.sub;
  } catch {
    return null;
  }
}

export const PASSWORD_RESET_TTL_SECONDS = 15 * 60; // 15 minutes

export async function createPasswordResetToken(
  userId: number,
  passwordHash: string,
): Promise<string> {
  const fingerprint = passwordHash.slice(-10);
  return new SignJWT({ purpose: "password_reset", fp: fingerprint })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(userId))
    .setIssuedAt()
    .setExpirationTime(`${PASSWORD_RESET_TTL_SECONDS}s`)
    .sign(secretKey());
}

export type VerifiedResetToken = {
  userId: number;
  fingerprint: string;
};

export async function verifyPasswordResetToken(
  token: string,
): Promise<VerifiedResetToken | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(), {
      algorithms: ["HS256"],
    });
    if (payload.purpose !== "password_reset" || !payload.sub || typeof payload.fp !== "string") {
      return null;
    }
    const id = Number(payload.sub);
    if (!Number.isInteger(id) || id <= 0) return null;
    return { userId: id, fingerprint: payload.fp };
  } catch {
    return null;
  }
}
