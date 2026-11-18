import { cache } from "react";
import { redirect } from "next/navigation";

import type { UserRole } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { homeForRole } from "@/lib/nav";

export type SessionUser = {
  id: number;
  role: UserRole;
  fullName: string;
  username: string;
};

/**
 * Loads the signed-in user from the JWT and re-reads the row so a disabled or
 * deleted account loses access immediately instead of waiting for token expiry.
 * Wrapped with React cache() to deduplicate queries between layout and page in
 * the same render pass.
 */
export const currentUser = cache(async (): Promise<SessionUser | null> => {
  const session = await auth();
  const id = Number(session?.user?.id);
  if (!Number.isInteger(id) || id <= 0) return null;

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true, fullName: true, username: true, status: true },
  });

  if (!user || user.status !== "active") return null;

  return {
    id: user.id,
    role: user.role,
    fullName: user.fullName,
    username: user.username,
  };
});

export async function requireUser(): Promise<SessionUser> {
  const user = await currentUser();
  if (!user) redirect("/login");
  return user;
}

/** Guards a role layout; a signed-in user hitting the wrong area is sent home. */
export async function requireRole(role: UserRole | UserRole[]): Promise<SessionUser> {
  const user = await requireUser();
  const allowed = Array.isArray(role) ? role : [role];
  if (!allowed.includes(user.role)) {
    redirect(homeForRole(user.role));
  }
  return user;
}
