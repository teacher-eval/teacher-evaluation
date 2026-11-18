import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthAlert, AuthFooter, AuthHeader, AuthNotice } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";
import { homeForRole } from "@/lib/nav";
import { currentUser } from "@/lib/rbac";

export const metadata: Metadata = { title: "Sign In" };

const ERROR_MESSAGES: Record<string, string> = {
  invalid: "Invalid credentials for the selected role.",
  inactive: "Your account is inactive.",
  timeout: "Session expired. Please log in again.",
  role: "Please select a valid role.",
  "2fa_send": "Failed to send the verification code. Please contact support.",
  "2fa_attempts": "Too many failed verification attempts. Please try again later.",
  "2fa_expired": "Your verification code expired. Please sign in again.",
  "2fa_session": "Your verification session expired. Please sign in again.",
  rate_limit: "Too many login attempts. Please wait a few minutes before trying again.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await currentUser();
  if (user) redirect(homeForRole(user.role));

  const params = await searchParams;
  const errorKey = typeof params.error === "string" ? params.error : undefined;
  const message = errorKey ? ERROR_MESSAGES[errorKey] : undefined;
  const loggedOut = params.logout === "1";

  return (
    <div className="mx-auto w-full max-w-[400px]">
      <div className="auth-card">
        <AuthHeader
          title="TVET Digital Feedback"
          subtitle="Sign in to access your portal"
          note="ASCB • TVET Department"
        />

        {message ? <AuthAlert message={message} /> : null}
        {loggedOut ? <AuthNotice message="Successfully logged out." /> : null}

        <LoginForm />
        <AuthFooter />
      </div>
    </div>
  );
}
