"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { signIn, signOut } from "@/auth";
import type { UserRole } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";
import { logAudit, logError, logSecurity } from "@/lib/logger";
import { homeForRole } from "@/lib/nav";
import {
  clientIp,
  enforceEmailResendLimit,
  enforceLoginLimit,
  enforceRegisterLimit,
  enforceTwoFactorLimit,
  pruneRateLimits,
} from "@/lib/rate-limit";
import { createLoginToken } from "@/lib/tokens";
import {
  generateEmailCode,
  hashOtp,
  verifyOtp,
  verifyTotp,
  TWO_FACTOR_MAX_ATTEMPTS,
} from "@/lib/two-factor";
import {
  clearChallengeCookie,
  getPendingChallenge,
  startChallenge,
  type TwoFactorConfig,
} from "@/server/auth/challenge";
import { comparePassword, hashPassword } from "@/server/auth/password";

export type AuthFormState = {
  error?: string;
  notice?: string;
  values?: Record<string, string>;
};

const ROLE_VALUES = ["student", "teacher", "admin"] as const;


function isNextRedirect(error: unknown): boolean {
  return (
    Boolean(error) &&
    typeof error === "object" &&
    "digest" in (error as Record<string, unknown>) &&
    typeof (error as Record<string, unknown>).digest === "string" &&
    ((error as Record<string, unknown>).digest as string).startsWith("NEXT_REDIRECT")
  );
}

async function finishLogin(user: { id: number; role: UserRole }): Promise<never> {
  const token = await createLoginToken(user.id);
  try {
    await signIn("credentials", {
      token,
      redirectTo: homeForRole(user.role),
    });
  } catch (error) {
    if (isNextRedirect(error)) {
      throw error;
    }
    logError("auth.signin_failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
  redirect(homeForRole(user.role));
}

/* -------------------------------------------------------------------------- */
/* Login                                                                      */
/* -------------------------------------------------------------------------- */

const loginSchema = z.object({
  username: z.string().trim().min(1, "Enter your username.").max(50),
  password: z.string().min(1, "Enter your password."),
  role: z.enum(ROLE_VALUES, "Select your account type."),
});

export async function loginAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const limit = await enforceLoginLimit();
  if (!limit.allowed) {
    return { error: "Too many login attempts. Please wait a few minutes and try again." };
  }

  const parsed = loginSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
    role: formData.get("role") ?? "student",
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Please check the form and try again.",
      values: {
        username: String(formData.get("username") ?? ""),
        role: String(formData.get("role") ?? "student"),
      },
    };
  }

  const { username, password, role } = parsed.data;

  const user = await prisma.user.findFirst({
    where: { username, role },
    include: { twoFactor: true },
  });

  // Always do a comparison so a missing account and a wrong password take the
  // same amount of time. This dummy hash is a valid bcrypt string.
  const hash =
    user?.password ??
    "$2b$12$C6UzMDM.H6dfI/f/IKcEeO7ZBpR1sVt4w7ZQ9d5GnsFZ8Xk7M0iJ6";
  const passwordOk = await comparePassword(password, hash);

  if (!user || !passwordOk) {
    logSecurity("login_failed", { username, role, ip: await clientIp() });
    return {
      error: "Invalid username, password, or account type.",
      values: { username, role },
    };
  }

  if (user.status !== "active" && user.status !== "pending_2fa") {
    return { error: "This account is inactive. Please contact the administrator." };
  }

  // Teachers never receive a challenge (legacy rule), and accounts that were
  // already activated log in with a password only.
  const needsVerification = user.role !== "teacher" && user.status === "pending_2fa";

  if (needsVerification) {
    const config: TwoFactorConfig | null = user.twoFactor
      ? {
          isEnabled: user.twoFactor.isEnabled,
          method: user.twoFactor.method,
          email: user.twoFactor.email,
          totpSecret: user.twoFactor.totpSecret,
        }
      : null;

    const started = await startChallenge(
      {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
      },
      config,
    );

    if (!started.ok) {
      return {
        error:
          started.reason === "send_failed"
            ? "We could not send the verification code. Please try again."
            : "Two-factor authentication is not configured for this account. Contact the administrator.",
      };
    }

    redirect("/verify-2fa");
  }

  await prisma.rateLimit.deleteMany({ where: { key: `login_${await clientIp()}` } });
  void pruneRateLimits();

  logAudit("login_success", { userId: user.id, role: user.role });
  try {
    await finishLogin(user);
    return {};
  } catch (error) {
    if (isNextRedirect(error)) {
      throw error;
    }
    return {
      error: "Unable to sign in right now. Please check your credentials and try again.",
      values: { username, role },
    };
  }
}

/* -------------------------------------------------------------------------- */
/* Verification                                                               */
/* -------------------------------------------------------------------------- */

export async function verifyTwoFactorAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const limit = await enforceTwoFactorLimit();
  if (!limit.allowed) {
    return { error: "Too many verification attempts. Please wait a few minutes." };
  }

  const code = String(formData.get("code") ?? "").replace(/\D/g, "");
  if (code.length !== 6) {
    return { error: "Please enter the 6-digit code." };
  }

  const challenge = await getPendingChallenge();
  if (!challenge) {
    await clearChallengeCookie();
    redirect("/login?error=2fa_session");
  }

  if (challenge.expiresAt.getTime() <= Date.now()) {
    await clearChallengeCookie();
    redirect("/login?error=2fa_expired");
  }

  if (challenge.attempts >= TWO_FACTOR_MAX_ATTEMPTS) {
    await prisma.authChallenge.update({
      where: { id: challenge.id },
      data: { consumedAt: new Date() },
    });
    await clearChallengeCookie();
    logSecurity("2fa_blocked", { userId: challenge.userId, reason: "too_many_attempts" });
    redirect("/login?error=2fa_attempts");
  }

  const updated = await prisma.authChallenge.update({
    where: { id: challenge.id },
    data: { attempts: { increment: 1 } },
    select: { attempts: true },
  });

  let valid = false;
  if (challenge.method === "email") {
    valid =
      Boolean(challenge.codeHash) && (await verifyOtp(code, challenge.codeHash!));
  } else if (challenge.method === "totp") {
    valid =
      Boolean(challenge.totpSecret) && verifyTotp(challenge.totpSecret!, code);
  }

  if (!valid) {
    if (updated.attempts >= TWO_FACTOR_MAX_ATTEMPTS) {
      await prisma.authChallenge.update({
        where: { id: challenge.id },
        data: { consumedAt: new Date() },
      });
      await clearChallengeCookie();
      logSecurity("2fa_blocked", { userId: challenge.userId, reason: "attempt_cap" });
      redirect("/login?error=2fa_attempts");
    }
    return { error: "Invalid verification code. Please try again." };
  }

  await prisma.authChallenge.update({
    where: { id: challenge.id },
    data: { consumedAt: new Date() },
  });

  // Completing verification activates a brand-new student account.
  if (challenge.role !== "teacher") {
    await prisma.user.updateMany({
      where: { id: challenge.userId, status: "pending_2fa" },
      data: { status: "active" },
    });
  }

  await clearChallengeCookie();
  logAudit("2fa_success", { userId: challenge.userId, method: challenge.method });

  const user = await prisma.user.findUnique({
    where: { id: challenge.userId },
    select: { id: true, role: true, status: true },
  });

  if (!user || user.status !== "active") {
    redirect("/login?error=inactive");
  }

  await finishLogin(user);
  return {};
}

export async function resendCodeAction(): Promise<AuthFormState> {
  const challenge = await getPendingChallenge();
  if (!challenge) {
    await clearChallengeCookie();
    return { error: "Your verification session expired. Please sign in again." };
  }

  if (challenge.method !== "email" || !challenge.email) {
    return { error: "A new code cannot be sent for this method." };
  }

  const cooldown = await enforceEmailResendLimit(challenge.id);
  if (!cooldown.allowed) {
    return { error: "Please wait a few seconds before requesting another code." };
  }

  const code = generateEmailCode();
  const codeHash = await hashOtp(code);

  await prisma.authChallenge.update({
    where: { id: challenge.id },
    data: {
      codeHash,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    },
  });

  const { sendTwoFactorEmail } = await import("@/lib/two-factor");
  const sent = await sendTwoFactorEmail(challenge.email, code, challenge.username);
  if (!sent) {
    return { error: "We could not send the code. Please try again." };
  }

  return { notice: "A new code is on its way. Check your inbox and spam folder." };
}

/* -------------------------------------------------------------------------- */
/* Registration                                                               */
/* -------------------------------------------------------------------------- */

const registerSchema = z
  .object({
    fullName: z.string().trim().min(1, "Full name is required.").max(100),
    username: z
      .string()
      .trim()
      .min(3, "Username must be between 3 and 50 characters.")
      .max(50, "Username must be between 3 and 50 characters.")
      .regex(/^[a-zA-Z0-9_]+$/, "Username may only contain letters, numbers, and underscores."),
    email: z.email("Please enter a valid email address."),
    course: z.string().trim().min(1, "Please select a course."),
    yearLevel: z.coerce
      .number()
      .int()
      .min(1, "Please select a valid year level.")
      .max(3, "Please select a valid year level."),
    password: z.string().min(8, "Password must be at least 8 characters."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export async function registerAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const limit = await enforceRegisterLimit();
  if (!limit.allowed) {
    return { error: "Too many registration attempts. Please wait a few minutes." };
  }

  const parsed = registerSchema.safeParse({
    fullName: formData.get("full_name"),
    username: formData.get("username"),
    email: formData.get("email"),
    course: formData.get("course"),
    yearLevel: formData.get("year_level"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirm_password"),
  });

  const values = {
    full_name: String(formData.get("full_name") ?? ""),
    username: String(formData.get("username") ?? ""),
    email: String(formData.get("email") ?? ""),
    course: String(formData.get("course") ?? ""),
    year_level: String(formData.get("year_level") ?? ""),
  };

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Please check the form and try again.",
      values,
    };
  }

  const { fullName, username, email, course, yearLevel, password } = parsed.data;

  const [usernameTaken, emailTaken, courseExists] = await Promise.all([
    prisma.user.findUnique({ where: { username }, select: { id: true } }),
    prisma.user2fa.findUnique({ where: { email }, select: { userId: true } }),
    prisma.course.findUnique({ where: { courseCode: course }, select: { id: true } }),
  ]);

  if (usernameTaken) {
    return { error: "That username is already taken. Please choose another.", values };
  }
  if (emailTaken) {
    return {
      error: "That email address is already linked to another account.",
      values,
    };
  }
  if (!courseExists) {
    return { error: "Please select a valid course.", values };
  }

  const passwordHash = await hashPassword(password);

  let user;
  try {
    user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          username,
          password: passwordHash,
          fullName,
          role: "student",
          status: "pending_2fa",
        },
      });

      await tx.student.create({
        data: { userId: created.id, course, yearLevel, status: "active" },
      });

      await tx.user2fa.create({
        data: {
          userId: created.id,
          isEnabled: true,
          method: "email",
          email,
        },
      });

      return created;
    });
  } catch {
    return { error: "Registration failed. Please try again.", values };
  }

  logAudit("student_registration", { userId: user.id, username });

  const started = await startChallenge(
    {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
    },
    { isEnabled: true, method: "email", email, totpSecret: null },
  );

  if (!started.ok) {
    return {
      error: "Your account was created, but we could not send the verification code. Please sign in to try again.",
    };
  }

  redirect("/verify-2fa");
}

/* -------------------------------------------------------------------------- */
/* 2FA email change (mid-verification)                                        */
/* -------------------------------------------------------------------------- */

export async function changeTwoFactorEmailAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const challenge = await getPendingChallenge();
  if (!challenge) {
    await clearChallengeCookie();
    redirect("/login?error=2fa_session");
  }

  const parsed = z
    .object({ email: z.email("Please enter a valid email address.") })
    .safeParse({ email: formData.get("email") });

  const values = { email: String(formData.get("email") ?? "") };

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid email address.", values };
  }

  const email = parsed.data.email;
  const taken = await prisma.user2fa.findUnique({
    where: { email },
    select: { userId: true },
  });

  if (taken && taken.userId !== challenge.userId) {
    return { error: "That email address is already linked to another account.", values };
  }

  await prisma.user2fa.upsert({
    where: { userId: challenge.userId },
    create: {
      userId: challenge.userId,
      isEnabled: true,
      method: "email",
      email,
    },
    update: { email, isEnabled: true, method: "email" },
  });

  // Consume the old challenge before issuing a fresh one.
  await prisma.authChallenge.update({
    where: { id: challenge.id },
    data: { consumedAt: new Date() },
  });
  await clearChallengeCookie();

  const started = await startChallenge(
    {
      id: challenge.userId,
      username: challenge.username,
      fullName: challenge.fullName,
      role: challenge.role,
    },
    { isEnabled: true, method: "email", email, totpSecret: null },
  );

  if (!started.ok) {
    return { error: "Could not send a code to that address. Please try again." };
  }

  logAudit("2fa_email_changed", { userId: challenge.userId });
  redirect("/verify-2fa");
}

/* -------------------------------------------------------------------------- */
/* Logout                                                                     */
/* -------------------------------------------------------------------------- */

export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: "/login?logout=1" });
}
