import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthFooter, AuthHeader } from "@/components/auth/auth-shell";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { homeForRole } from "@/lib/nav";
import { currentUser } from "@/lib/rbac";

export const metadata: Metadata = { title: "Forgot Password" };

export default async function ForgotPasswordPage() {
  const user = await currentUser();
  if (user) redirect(homeForRole(user.role));

  return (
    <div className="mx-auto w-full max-w-[440px] py-6">
      <div className="auth-card">
        <AuthHeader
          title="Forgot Password"
          subtitle="Enter your email to receive a password reset link"
          note="ASCB • TVET Department"
        />
        <ForgotPasswordForm />
        <AuthFooter />
      </div>
    </div>
  );
}
