import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/app-shell";
import { EvaluationSettingsScreen } from "@/components/admin/evaluation-settings-screen";
import { requireRole } from "@/lib/rbac";
import { getEvaluationSettingsData } from "@/server/queries/admin-evaluation-settings";

export const metadata: Metadata = { title: "Evaluation Settings" };
export const dynamic = "force-dynamic";

export default async function EvaluationSettingsPage() {
  await requireRole("admin");
  const data = await getEvaluationSettingsData();

  return (
    <>
      <PageHeader
        title="Evaluation Settings"
        subtitle="Configure evaluation periods and active semesters."
      />
      <EvaluationSettingsScreen data={data} />
    </>
  );
}
