import { SignJWT, jwtVerify } from "jose";

import { requireEnv } from "@/lib/env";

const encoder = new TextEncoder();

function secretKey(): Uint8Array {
  return encoder.encode(requireEnv("AUTH_SECRET"));
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
