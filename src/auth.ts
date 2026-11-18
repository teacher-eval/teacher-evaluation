import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

import type { UserRole } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";
import { verifyLoginToken } from "@/lib/tokens";

/**
 * Auth.js configuration.
 *
 * Credentials providers force JWT sessions. The password comparison does NOT
 * happen in `authorize()`: it runs in server actions so it can rate-limit,
 * show validation errors and run the 2FA challenge. By the time `authorize()`
 * sees a request it only has to validate a short-lived signed hand-off token.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  secret: process.env.AUTH_SECRET,
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
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = String(token.id ?? "");
      session.user.role = token.role as UserRole;
      return session;
    },
  },
});
