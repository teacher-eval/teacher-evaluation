import { AppShell } from "@/components/layout/app-shell";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/rbac";
import { teacherAvatarUrl } from "@/lib/storage";
import { signOutAction } from "@/server/actions/auth";

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("teacher");
  const teacher = await prisma.teacher.findUnique({
    where: { userId: user.id },
    select: { department: true, profileImage: true },
  });

  return (
    <AppShell
      role="teacher"
      user={{
        fullName: user.fullName,
        subtitle: teacher?.department?.trim() || "Instructor",
        avatarUrl: teacherAvatarUrl(teacher?.profileImage),
      }}
      signOut={signOutAction}
    >
      {children}
    </AppShell>
  );
}
