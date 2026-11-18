import type { Metadata } from "next";

import { AccountSettingsForms } from "@/components/account/account-settings-forms";
import { PageHeader } from "@/components/layout/app-shell";
import { requireRole } from "@/lib/rbac";

export const metadata: Metadata = { title: "Account Settings" };

export default async function AdminAccountPage() {
  const user = await requireRole("admin");

  return (
    <>
      <PageHeader
        title="Account Settings"
        subtitle="Manage your administrator profile and security."
      />
      <AccountSettingsForms fullName={user.fullName} username={user.username} />
    </>
  );
}
