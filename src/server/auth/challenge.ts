import { cookies } from "next/headers";

import type { TwoFactorMethod, UserRole } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";
import { logError } from "@/lib/logger";
import {
  CHALLENGE_COOKIE,
  CHALLENGE_TTL_SECONDS,
  createChallengeCookie,
  readChallengeCookie,
} from "@/lib/tokens";
import {
  generateEmailCode,
  hashOtp,
  sendTwoFactorEmail,
  TWO_FACTOR_CODE_TTL_SECONDS,
} from "@/lib/two-factor";

export type ChallengeUser = {
  id: number;
  username: string;
  fullName: string;
  role: UserRole;
};

export type TwoFactorConfig = {
  isEnabled: boolean;
  method: TwoFactorMethod;
  email: string | null;
  totpSecret: string | null;
};

export type StartChallengeResult =
  | { ok: true; challengeId: string; method: TwoFactorMethod }
  | { ok: false; reason: "not_configured" | "send_failed" };

/**
 * Creates a pending 2FA challenge and, for the email method, sends the code.
 * The state lives in Postgres so a client cannot reset its attempt counter by
 * editing a cookie.
 */
export async function startChallenge(
  user: ChallengeUser,
  config: TwoFactorConfig | null,
): Promise<StartChallengeResult> {
  if (!config || !config.isEnabled) {
    return { ok: false, reason: "not_configured" };
  }

  const method = config.method;
  if (method === "email" && !config.email) {
    return { ok: false, reason: "not_configured" };
  }
  if (method === "totp" && !config.totpSecret) {
    return { ok: false, reason: "not_configured" };
  }

  const expiresAt = new Date(
    Date.now() +
      (method === "email" ? TWO_FACTOR_CODE_TTL_SECONDS : CHALLENGE_TTL_SECONDS) * 1000,
  );

  const challenge = await prisma.authChallenge.create({
    data: {
      userId: user.id,
      method,
      expiresAt,
    },
  });

  if (method === "email") {
    const code = generateEmailCode();
    const codeHash = await hashOtp(code);

    await prisma.authChallenge.update({
      where: { id: challenge.id },
      data: { codeHash },
    });

    const sent = await sendTwoFactorEmail(config.email!, code, user.username);
    if (!sent) {
      await prisma.authChallenge.delete({ where: { id: challenge.id } }).catch(() => {});
      logError("auth.2fa_email_failed", { userId: user.id });
      return { ok: false, reason: "send_failed" };
    }
  }

  await setChallengeCookie(challenge.id);
  return { ok: true, challengeId: challenge.id, method };
}

export async function setChallengeCookie(challengeId: string): Promise<void> {
  const token = await createChallengeCookie(challengeId);
  const jar = await cookies();
  jar.set(CHALLENGE_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: CHALLENGE_TTL_SECONDS,
  });
}

export async function clearChallengeCookie(): Promise<void> {
  const jar = await cookies();
  jar.set(CHALLENGE_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export async function challengeIdFromCookie(): Promise<string | null> {
  const jar = await cookies();
  const raw = jar.get(CHALLENGE_COOKIE)?.value;
  if (!raw) return null;
  return readChallengeCookie(raw);
}

export type PendingChallenge = {
  id: string;
  method: TwoFactorMethod;
  attempts: number;
  expiresAt: Date;
  userId: number;
  username: string;
  fullName: string;
  role: UserRole;
  /** `pending_2fa` means the account has never finished verification. */
  status: string;
  email: string | null;
  totpSecret: string | null;
  codeHash: string | null;
};

/** Loads the pending challenge for the verification page/action. */
export async function getPendingChallenge(): Promise<PendingChallenge | null> {
  const id = await challengeIdFromCookie();
  if (!id) return null;

  const challenge = await prisma.authChallenge.findUnique({
    where: { id },
    include: {
      user: {
        include: { twoFactor: true },
      },
    },
  });

  if (!challenge) return null;
  if (challenge.consumedAt) return null;

  return {
    id: challenge.id,
    method: challenge.method,
    attempts: challenge.attempts,
    expiresAt: challenge.expiresAt,
    userId: challenge.userId,
    username: challenge.user.username,
    fullName: challenge.user.fullName,
    role: challenge.user.role,
    status: challenge.user.status,
    email: challenge.user.twoFactor?.email ?? null,
    totpSecret: challenge.user.twoFactor?.totpSecret ?? null,
    codeHash: challenge.codeHash,
  };
}

/**
 * Kept out of the page components: reading the clock directly during render is
 * flagged by react-hooks/purity, and a server component only renders once per
 * request anyway.
 */
export function isChallengeExpired(challenge: { expiresAt: Date }): boolean {
  return challenge.expiresAt.getTime() <= Date.now();
}
