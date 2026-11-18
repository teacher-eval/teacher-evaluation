import type { UserRole } from "@/generated/prisma/enums";
import { Sidebar, type SidebarUser } from "@/components/layout/sidebar";
import { navForRole } from "@/lib/nav";

type AppShellProps = {
  role: UserRole;
  user: SidebarUser;
  signOut: () => Promise<void>;
  children: React.ReactNode;
};

/**
 * Role-agnostic page frame: sidebar + scrollable main column.
 * Access control lives in each role's layout.tsx, not here.
 */
export function AppShell({ role, user, signOut, children }: AppShellProps) {
  return (
    <div className="flex min-h-screen">
      <Sidebar user={user} nav={navForRole(role)} signOut={signOut} />
      <main id="main-content" tabIndex={-1} className="app-main">
        {children}
      </main>
    </div>
  );
}

type PageHeaderProps = {
  title: string;
  subtitle?: React.ReactNode;
  /** Rendered before the title block, e.g. an avatar. */
  leading?: React.ReactNode;
  actions?: React.ReactNode;
};

export function PageHeader({ title, subtitle, leading, actions }: PageHeaderProps) {
  return (
    <header className="page-header">
      <div className={leading ? "flex items-center gap-4" : undefined}>
        {leading}
        <div>
          <h1 className="page-title">{title}</h1>
          {subtitle ? <p className="page-subtitle">{subtitle}</p> : null}
        </div>
      </div>
      {actions ? <div className="page-actions">{actions}</div> : null}
    </header>
  );
}
