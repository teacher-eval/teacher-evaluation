import { AppShell } from "@/components/layout/app-shell";
import { requireRole } from "@/lib/rbac";
import { roleLabel } from "@/lib/nav";
import { signOutAction } from "@/server/actions/auth";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("student");

  return (
    <AppShell
      role="student"
      user={{ fullName: user.fullName, subtitle: roleLabel("student") }}
      signOut={signOutAction}
    >
      {children}
    </AppShell>
  );
}
