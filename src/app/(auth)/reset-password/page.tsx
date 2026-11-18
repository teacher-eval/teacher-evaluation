import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthFooter, AuthHeader } from "@/components/auth/auth-shell";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { homeForRole } from "@/lib/nav";
import { currentUser } from "@/lib/rbac";

export const metadata: Metadata = { title: "Reset Password" };

type Props = {
  searchParams: Promise<{ token?: string }>;
};

export default async function ResetPasswordPage({ searchParams }: Props) {
  const user = await currentUser();
  if (user) redirect(homeForRole(user.role));

  const { token } = await searchParams;

  if (!token) {
    redirect("/forgot-password");
  }

  return (
    <div className="mx-auto w-full max-w-[440px] py-6">
      <div className="auth-card">
        <AuthHeader
          title="Reset Password"
          subtitle="Enter your new password below"
          note="ASCB • TVET Department"
        />
        <ResetPasswordForm token={token} />
        <AuthFooter />
      </div>
    </div>
  );
}
