import type { Metadata } from "next";

import { AccountSettingsForms } from "@/components/account/account-settings-forms";
import { IdentityHeader } from "@/components/account/identity-header";
import { PageHeader } from "@/components/layout/app-shell";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { teacherAvatarUrl } from "@/lib/storage-url";

export const metadata: Metadata = { title: "Account Settings" };

export default async function TeacherAccountPage() {
  const user = await requireRole("teacher");

  const [account, teacher] = await Promise.all([
    prisma.user.findUnique({
      where: { id: user.id },
      select: { status: true },
    }),
    prisma.teacher.findUnique({
      where: { userId: user.id },
      select: { department: true, profileImage: true },
    }),
  ]);

  return (
    <>
      <PageHeader
        title="Account Settings"
        subtitle="Manage your professional profile and security."
      />

      <IdentityHeader
        fullName={user.fullName}
        username={user.username}
        status={account?.status ?? "active"}
        department={teacher?.department}
        avatarUrl={teacherAvatarUrl(teacher?.profileImage)}
        note="Your profile photo is managed by the administrator."
      />

      <AccountSettingsForms fullName={user.fullName} username={user.username} />
    </>
  );
}
