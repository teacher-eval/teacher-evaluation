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
 * it is only trusted when TRUST_PROXY is enabled.
 */
export async function clientIp(): Promise<string> {
  try {
    const h = await headers();
    const forwarded = h.get("x-forwarded-for");
    const trustProxy =
      process.env.TRUST_PROXY === "true" || Boolean(process.env.VERCEL);

    if (forwarded && trustProxy) {
      return forwarded.split(",")[0]!.trim();
    }
    return h.get("x-real-ip")?.trim() || "unknown";
  } catch {
    return "unknown";
  }
}

/**
 * Fixed-window limiter backed by Prisma.
 *
 * Uses standard Prisma queries instead of raw SQL to be 100% portable across
 * direct connections and transaction poolers.
 * Includes fail-open error handling so network/pooler glitches never crash user login.
 */
export async function rateLimit(
  key: string,
  maxHits: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  try {
    const now = new Date();
    const windowStartThreshold = new Date(now.getTime() - windowSeconds * 1000);

    const existing = await prisma.rateLimit.findUnique({
      where: { key },
    });

    if (!existing) {
      await prisma.rateLimit.create({
        data: {
          key,
          hits: 1,
          windowStart: now,
          blockedUntil: null,
        },
      });
      return { allowed: true };
    }

    if (existing.blockedUntil && existing.blockedUntil.getTime() > now.getTime()) {
      return {
        allowed: false,
        retryAfterSeconds: Math.ceil(
          (existing.blockedUntil.getTime() - now.getTime()) / 1000,
        ),
      };
    }

    const isExpired = existing.windowStart <= windowStartThreshold;
    const newHits = isExpired ? 1 : existing.hits + 1;
    const newWindowStart = isExpired ? now : existing.windowStart;

    if (newHits > maxHits) {
      const blockSeconds = windowSeconds * 2;
      const until = new Date(now.getTime() + blockSeconds * 1000);
      await prisma.rateLimit.update({
        where: { key },
        data: {
          hits: 0,
          blockedUntil: until,
        },
      });
      return { allowed: false, retryAfterSeconds: blockSeconds };
    }

    await prisma.rateLimit.update({
      where: { key },
      data: {
        hits: newHits,
        windowStart: newWindowStart,
      },
    });

    return { allowed: true };
  } catch (error) {
    // Fail-open: Never block legitimate users if rate-limiting encounters a glitch
    console.warn("rateLimit error (failing open):", error);
    return { allowed: true };
  }
}

export async function enforceLoginLimit(): Promise<RateLimitResult> {
  return rateLimit(`login_${await clientIp()}`, 10, 60);
}

export async function enforceRegisterLimit(): Promise<RateLimitResult> {
  return rateLimit(`register_${await clientIp()}`, 5, 300);
}

export async function enforceTwoFactorLimit(): Promise<RateLimitResult> {
  return rateLimit(`2fa_${await clientIp()}`, 5, 300);
}

export async function enforcePasswordChangeLimit(role: string): Promise<RateLimitResult> {
  return rateLimit(`pwd_${role}_${await clientIp()}`, 5, 900);
}

export async function enforceEmailResendLimit(challengeId: string): Promise<RateLimitResult> {
  return rateLimit(`2fa_resend_${challengeId}`, 3, 60);
}

export async function enforcePasswordResetLimit(): Promise<RateLimitResult> {
  return rateLimit(`pwd_reset_${await clientIp()}`, 5, 300);
}

export async function pruneRateLimits(): Promise<void> {
  try {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    await prisma.rateLimit.deleteMany({
      where: {
        windowStart: { lt: cutoff },
        blockedUntil: null,
      },
    });
  } catch (error) {
    console.warn("pruneRateLimits error:", error);
  }
}
