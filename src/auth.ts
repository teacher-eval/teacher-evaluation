import { createHash } from "node:crypto";

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

import type { UserRole } from "@/generated/prisma/enums";
import { authSecret } from "@/lib/auth-secret";
import { prisma } from "@/lib/db";
import { verifyLoginToken } from "@/lib/tokens";

/**
 * Fingerprint of the stored password hash.
 *
 * It travels inside the encrypted session JWT and is re-checked against the
 * database on every session read, so changing or resetting a password revokes
 * every other session immediately instead of leaving them valid until expiry.
 */
function passwordFingerprint(hash: string): string {
  return createHash("sha256").update(hash).digest("hex").slice(0, 32);
}

/**
 * Auth.js configuration.
 *
 * Credentials providers force JWT sessions. The password comparison does NOT
 * happen in `authorize()`: it runs in server actions so it can rate-limit,
 * show validation errors and run the 2FA challenge. By the time `authorize()`
 * sees a request it only has to validate a short-lived signed hand-off token.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  // No fallback: a committed default secret would allow session forgery.
  secret: authSecret(),
  session: {
    strategy: "jwt",
    maxAge: 30 * 60, // SESSION_LIFETIME = 1800s
    updateAge: 5 * 60, // slide the window while the user is active
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        token: { label: "Login token", type: "text" },
      },
      async authorize(raw) {
        const token = typeof raw?.token === "string" ? raw.token : "";
        const userId = await verifyLoginToken(token);
        if (!userId) return null;

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return null;
        if (user.status !== "active" && user.status !== "pending_2fa") return null;

        return {
          id: String(user.id),
          name: user.fullName,
          role: user.role,
          passwordFingerprint: passwordFingerprint(user.password),
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.passwordFingerprint = user.passwordFingerprint;
        return token;
      }

      const id = Number(token.id);
      if (!Number.isInteger(id) || id <= 0) return null;

      // Re-read the row on every request: a deleted or disabled account, or a
      // password change, invalidates the token instead of waiting for expiry.
      const current = await prisma.user.findUnique({
        where: { id },
        select: { status: true, role: true, password: true },
      });

      if (!current || current.status !== "active") return null;
      if (token.passwordFingerprint !== passwordFingerprint(current.password)) return null;

      // Keep the role in sync in case an administrator changed it.
      token.role = current.role;
      return token;
    },
    session({ session, token }) {
      session.user.id = String(token.id ?? "");
      session.user.role = token.role as UserRole;
      return session;
    },
  },
});
