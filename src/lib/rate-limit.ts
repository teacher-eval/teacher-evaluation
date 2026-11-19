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
 * Fixed-window limiter backed by Postgres.
 *
 * Each key owns a row that is inserted on first use and then locked with
 * `SELECT … FOR UPDATE`, so concurrent requests for the same key cannot read
 * the same counter and overwrite each other's increment. Includes fail-open
 * error handling so network/pooler glitches never crash user login.
 */
export async function rateLimit(
  key: string,
  maxHits: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  try {
    const now = new Date();
    const windowStartThreshold = new Date(now.getTime() - windowSeconds * 1000);

    return await prisma.$transaction(async (tx) => {
      // First hit for this key. ON CONFLICT makes simultaneous first hits safe.
      await tx.$executeRaw`
        INSERT INTO "rate_limits" ("key", "hits", "window_start", "blocked_until")
        VALUES (${key}, 0, ${now}, NULL)
        ON CONFLICT ("key") DO NOTHING`;

      const rows = await tx.$queryRaw<
        { hits: number; window_start: Date; blocked_until: Date | null }[]
      >`
        SELECT "hits", "window_start", "blocked_until"
        FROM "rate_limits"
        WHERE "key" = ${key}
        FOR UPDATE`;

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

      const isExpired = row.window_start <= windowStartThreshold;
      const newHits = isExpired ? 1 : row.hits + 1;
      const newWindowStart = isExpired ? now : row.window_start;

      if (newHits > maxHits) {
        const blockSeconds = windowSeconds * 2;
        const until = new Date(now.getTime() + blockSeconds * 1000);
        await tx.$executeRaw`
          UPDATE "rate_limits"
          SET "hits" = 0, "window_start" = ${newWindowStart}, "blocked_until" = ${until}
          WHERE "key" = ${key}`;
        return { allowed: false, retryAfterSeconds: blockSeconds };
      }

      // Clearing blocked_until keeps the row prunable once the block expires.
      await tx.$executeRaw`
        UPDATE "rate_limits"
        SET "hits" = ${newHits}, "window_start" = ${newWindowStart}, "blocked_until" = NULL
        WHERE "key" = ${key}`;

      return { allowed: true };
    });
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

/**
 * Clears the per-account login counter after a successful password check.
 * The IP bucket is left alone on purpose: it exists to slow down an attacker
 * trying many accounts from one address.
 */
export async function resetLoginLimit(username: string): Promise<void> {
  try {
    await prisma.rateLimit.delete({
      where: { key: `login_user_${username.trim().toLowerCase()}` },
    });
  } catch {
    // No counter for this account (normal), or a transient DB error.
  }
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
        OR: [
          // Idle windows.
          { windowStart: { lt: cutoff }, blockedUntil: null },
          // Blocks that expired long enough ago to be irrelevant.
          { blockedUntil: { lt: new Date() } },
        ],
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
