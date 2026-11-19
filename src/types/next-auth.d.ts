import type { UserRole } from "@/generated/prisma/enums";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }

  interface User {
    role: UserRole;
    /**
     * Hash fingerprint used to revoke sessions when the password changes.
     * Never copied onto the session object, only into the encrypted JWT.
     */
    passwordFingerprint?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: UserRole;
    passwordFingerprint?: string;
  }
}
