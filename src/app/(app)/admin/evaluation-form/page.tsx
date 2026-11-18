import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/app-shell";
import { EvaluationFormBuilder } from "@/components/admin/evaluation-form-builder";
import { requireRole } from "@/lib/rbac";
import { getEvaluationQuestions } from "@/server/queries/admin-evaluation-form";

export const metadata: Metadata = { title: "Evaluation Form" };
export const dynamic = "force-dynamic";

export default async function EvaluationFormPage() {
  await requireRole("admin");
  const questions = await getEvaluationQuestions();

  return (
    <>
      <PageHeader
        title="Evaluation Form"
        subtitle="Edit the criteria students use to evaluate teachers."
      />
      <EvaluationFormBuilder initialQuestions={questions} />
    </>
  );
}
