import { headers } from "next/headers";

import { prisma } from "@/lib/db";

export type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds?: number;
};

/**
 * Best-effort client IP.
 *
 * Vercel terminates the connection and overwrites X-Forwarded-For, so the first
 * entry is the real peer. Anywhere else the header is attacker-controlled, so
 * it is only trusted when TRUST_PROXY is enabled (same rule as the PHP app).
 */
export async function clientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  const trustProxy = process.env.TRUST_PROXY === "true" || Boolean(process.env.VERCEL);

  if (forwarded && trustProxy) {
    return forwarded.split(",")[0]!.trim();
  }
  return h.get("x-real-ip")?.trim() || "unknown";
}

/**
 * Fixed-window limiter backed by Postgres.
 *
 * Replaces the JSON files in logs/rate_limits. Two statements: an atomic
 * increment, then (rarely) a block update. Mirrors the PHP thresholds, which
 * are passed by each caller.
 */
export async function rateLimit(
  key: string,
  maxHits: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - windowSeconds * 1000);

  const rows = await prisma.$queryRaw<
    Array<{ hits: number; blocked_until: Date | null }>
  >`
    INSERT INTO "rate_limits" ("key", "hits", "window_start", "blocked_until")
    VALUES (${key}, 1, ${now}, NULL)
    ON CONFLICT ("key") DO UPDATE SET
      "hits" = CASE
        WHEN "rate_limits"."window_start" <= ${windowStart} THEN 1
        ELSE "rate_limits"."hits" + 1
      END,
      "window_start" = CASE
        WHEN "rate_limits"."window_start" <= ${windowStart} THEN ${now}
        ELSE "rate_limits"."window_start"
      END
    RETURNING "hits", "blocked_until"
  `;

  const row = rows[0];
  if (!row) return { allowed: true };

  if (row.blocked_until && row.blocked_until.getTime() > now.getTime()) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil(
        (row.blocked_until.getTime() - now.getTime()) / 1000,
      ),
    };
  }

  if (row.hits > maxHits) {
    const blockSeconds = windowSeconds * 2; // PHP blocks for double the window
    const until = new Date(now.getTime() + blockSeconds * 1000);
    await prisma.rateLimit.update({
      where: { key },
      data: { blockedUntil: until, hits: 0 },
    });
    return { allowed: false, retryAfterSeconds: blockSeconds };
  }

  return { allowed: true };
}

export async function enforceLoginLimit(): Promise<RateLimitResult> {
  return rateLimit(`login_${await clientIp()}`, 10, 300);
}

export async function enforceRegisterLimit(): Promise<RateLimitResult> {
  return rateLimit(`register_${await clientIp()}`, 5, 600);
}

export async function enforceTwoFactorLimit(): Promise<RateLimitResult> {
  return rateLimit(`2fa_${await clientIp()}`, 10, 300);
}

export async function enforcePasswordChangeLimit(scope: string): Promise<RateLimitResult> {
  return rateLimit(`pwd_${scope}_${await clientIp()}`, 10, 600);
}

/** One send per 30 s per challenge, matching TWO_FACTOR_EMAIL_RESEND_COOLDOWN. */
export async function enforceEmailResendLimit(challengeId: string): Promise<RateLimitResult> {
  return rateLimit(`2fa_resend_${challengeId}`, 1, 30);
}

/** Housekeeping: drop counters that have been idle for a day. */
export async function pruneRateLimits(): Promise<void> {
  try {
    await prisma.rateLimit.deleteMany({
      where: {
        windowStart: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        OR: [{ blockedUntil: null }, { blockedUntil: { lt: new Date() } }],
      },
    });
  } catch {
    // Never let cleanup break a request.
  }
}
