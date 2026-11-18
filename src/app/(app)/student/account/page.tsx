import type { Metadata } from "next";

import { AccountSettingsForms } from "@/components/account/account-settings-forms";
import { PageHeader } from "@/components/layout/app-shell";
import { requireRole } from "@/lib/rbac";

export const metadata: Metadata = { title: "Account Settings" };

export default async function StudentAccountPage() {
  const user = await requireRole("student");

  return (
    <>
      <PageHeader
        title="Account Settings"
        subtitle="Manage your student profile and security."
      />
      <AccountSettingsForms fullName={user.fullName} username={user.username} />
    </>
  );
}
