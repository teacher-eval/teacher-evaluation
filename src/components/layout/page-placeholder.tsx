import { PageHeader } from "@/components/layout/app-shell";

/**
 * Temporary surface used while a page from the PHP app is being ported.
 * Every one of these is replaced by a real screen before launch.
 */
export function PagePlaceholder({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <>
      <PageHeader title={title} subtitle={subtitle} />
      <div className="surface-panel">
        <p className="text-sm font-semibold text-navy">Port in progress</p>
        <p className="mt-1 text-sm text-slate-600">
          This screen is next in the migration queue. The shell, navigation and access
          control are live so the surrounding pages can be built against them.
        </p>
      </div>
    </>
  );
}
