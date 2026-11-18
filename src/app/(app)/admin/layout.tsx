import { AppShell } from "@/components/layout/app-shell";
import { requireRole } from "@/lib/rbac";
import { roleLabel } from "@/lib/nav";
import { signOutAction } from "@/server/actions/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("admin");

  return (
    <AppShell
      role="admin"
      user={{ fullName: user.fullName, subtitle: roleLabel("admin") }}
      signOut={signOutAction}
    >
      {children}
    </AppShell>
  );
}
