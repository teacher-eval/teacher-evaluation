"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { logAudit, logSecurity } from "@/lib/logger";
import { enforcePasswordChangeLimit } from "@/lib/rate-limit";
import { requireUser } from "@/lib/rbac";
import { comparePassword, hashPassword } from "@/server/auth/password";

export type AccountFormState = {
  error?: string;
  success?: string;
  values?: {
    fullName?: string;
    username?: string;
  };
};

const profileSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Full name must be between 2 and 100 characters.")
    .max(100, "Full name must be between 2 and 100 characters."),
  username: z
    .string()
    .trim()
    .min(3, "Username must be 3–50 characters: letters, numbers, underscores only.")
    .max(50, "Username must be 3–50 characters: letters, numbers, underscores only.")
    .regex(
      /^[a-zA-Z0-9_]+$/,
      "Username must be 3–50 characters: letters, numbers, underscores only.",
    ),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "All password fields are required."),
    newPassword: z
      .string()
      .min(1, "All password fields are required.")
      .min(8, "New password must be at least 8 characters."),
    confirmPassword: z.string().min(1, "All password fields are required."),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "New passwords do not match.",
    path: ["confirmPassword"],
  });

/* -------------------------------------------------------------------------- */
/* Profile                                                                    */
/* -------------------------------------------------------------------------- */

export async function updateProfileAction(
  _prev: AccountFormState,
  formData: FormData,
): Promise<AccountFormState> {
  const user = await requireUser();

  const parsed = profileSchema.safeParse({
    fullName: formData.get("full_name"),
    username: formData.get("username"),
  });

  const values = {
    fullName: String(formData.get("full_name") ?? ""),
    username: String(formData.get("username") ?? ""),
  };

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Please check the form and try again.",
      values,
    };
  }

  const { fullName, username } = parsed.data;

  // Usernames are compared the way PHP did it: LOWER(username) = LOWER(?).
  const taken = await prisma.user.findFirst({
    where: {
      username: { equals: username, mode: "insensitive" },
      id: { not: user.id },
    },
    select: { id: true },
  });

  if (taken) {
    return {
      error: `Username "${username}" is already taken by another user.`,
      values,
    };
  }

  try {
    await prisma.user.update({
      where: { id: user.id },
      data: { fullName, username },
    });
  } catch {
    return { error: "Failed to update profile.", values };
  }

  logAudit("account.profile_updated", { userId: user.id });
  revalidatePath("/", "layout");

  return { success: "Profile updated successfully!", values };
}

/* -------------------------------------------------------------------------- */
/* Password                                                                   */
/* -------------------------------------------------------------------------- */

export async function changePasswordAction(
  _prev: AccountFormState,
  formData: FormData,
): Promise<AccountFormState> {
  const user = await requireUser();

  const limit = await enforcePasswordChangeLimit(user.role);
  if (!limit.allowed) {
    return {
      error:
        "Too many password change attempts. Please wait a few minutes before trying again.",
    };
  }

  const parsed = passwordSchema.safeParse({
    currentPassword: formData.get("current_password"),
    newPassword: formData.get("new_password"),
    confirmPassword: formData.get("confirm_password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form." };
  }

  const { currentPassword, newPassword } = parsed.data;

  const record = await prisma.user.findUnique({
    where: { id: user.id },
    select: { password: true },
  });

  if (!record || !(await comparePassword(currentPassword, record.password))) {
    logSecurity("account.password_change_failed", { userId: user.id });
    return { error: "Incorrect current password." };
  }

  try {
    await prisma.user.update({
      where: { id: user.id },
      data: { password: await hashPassword(newPassword) },
    });
  } catch {
    return { error: "Failed to update password." };
  }

  logAudit("account.password_changed", { userId: user.id });
  return { success: "Password updated successfully!" };
}
