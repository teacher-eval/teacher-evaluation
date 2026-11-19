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
 * it is only trusted when TRUST_PROXY is enabled. Returns `null` when no
 * trustworthy address is available instead of collapsing every visitor into a
 * single shared bucket (which one client could exhaust to lock everyone out).
 */
export async function clientIp(): Promise<string | null> {
  try {
    const h = await headers();
    const trustProxy =
      process.env.TRUST_PROXY === "true" || Boolean(process.env.VERCEL);
    const realIp = h.get("x-real-ip")?.trim() || null;

    if (trustProxy) {
      const forwarded = h.get("x-forwarded-for");
      const first = forwarded?.split(",")[0]?.trim();
      return first || realIp;
    }
    return realIp;
  } catch {
    return null;
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

/**
 * IP-scoped limiter. Without a trustworthy address it falls back to a global
 * bucket with a much higher ceiling, so the protection still exists but is not
 * trivially exhaustible by a single client.
 */
async function ipLimit(
  prefix: string,
  maxHits: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const ip = await clientIp();
  if (ip) return rateLimit(`${prefix}_${ip}`, maxHits, windowSeconds);
  return rateLimit(`${prefix}_noip`, maxHits * 10, windowSeconds);
}

/**
 * Login is limited per account *and* per IP. The account counter is the one
 * that matters: an IP-only limit is bypassed with rotating proxies, and it
 * would also lock out an entire campus sharing one NAT address.
 */
export async function enforceLoginLimit(username: string): Promise<RateLimitResult> {
  const account = await rateLimit(
    `login_user_${username.trim().toLowerCase()}`,
    10,
    15 * 60,
  );
  if (!account.allowed) return account;

  const ip = await clientIp();
  if (!ip) return account;
  return rateLimit(`login_${ip}`, 30, 60);
}

export async function enforceRegisterLimit(): Promise<RateLimitResult> {
  return ipLimit("register", 5, 300);
}

export async function enforceTwoFactorLimit(): Promise<RateLimitResult> {
  // The per-challenge attempt cap (5) is the real defence; this only stops an
  // attacker cycling through challenges, so the ceiling is kept high enough
  // for a campus sharing one NAT address.
  return ipLimit("2fa", 20, 300);
}

export async function enforcePasswordChangeLimit(role: string): Promise<RateLimitResult> {
  return ipLimit(`pwd_${role}`, 5, 900);
}

export async function enforceEmailResendLimit(challengeId: string): Promise<RateLimitResult> {
  return rateLimit(`2fa_resend_${challengeId}`, 3, 60);
}

/**
 * Changing the address that receives verification codes is a security-
 * sensitive operation: it is limited separately and never unlocked by a
 * successful login.
 */
export async function enforceTwoFactorChangeLimit(
  challengeId: string,
): Promise<RateLimitResult> {
  return rateLimit(`2fa_change_${challengeId}`, 3, 300);
}

export async function enforcePasswordResetLimit(): Promise<RateLimitResult> {
  return ipLimit("pwd_reset", 5, 300);
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

/** Expired 2FA challenges have no value and would otherwise grow forever. */
export async function pruneAuthChallenges(): Promise<void> {
  try {
    await prisma.authChallenge.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date(Date.now() - 60 * 60 * 1000) } },
          { consumedAt: { lt: new Date(Date.now() - 60 * 60 * 1000) } },
        ],
      },
    });
  } catch (error) {
    console.warn("pruneAuthChallenges error:", error);
  }
}
