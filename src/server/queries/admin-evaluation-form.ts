import { prisma } from "@/lib/db";
import { DEFAULT_QUESTIONS, type QuestionItem } from "@/lib/evaluation-defaults";

export { DEFAULT_QUESTIONS, type QuestionItem };

export async function getEvaluationQuestions(): Promise<QuestionItem[]> {
  const questions = await prisma.evaluationQuestion.findMany({
    orderBy: [{ sortOrder: "asc" }, { questionNo: "asc" }],
  });

  if (questions.length === 0) {
    // Seed the defaults on first read. The advisory lock serialises concurrent
    // first loads (e.g. two admins opening the page at once) so the ten rows
    // are inserted exactly once; there is no unique key to fall back on.
    return prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext('evaluation_questions_seed'))`;

      const existing = await tx.evaluationQuestion.findMany({
        orderBy: [{ sortOrder: "asc" }, { questionNo: "asc" }],
      });
      if (existing.length > 0) return existing;

      await tx.evaluationQuestion.createMany({
        data: DEFAULT_QUESTIONS.map((text, idx) => ({
          questionNo: idx + 1,
          questionText: text,
          sortOrder: idx + 1,
          isActive: true,
        })),
      });

      return tx.evaluationQuestion.findMany({
        orderBy: [{ sortOrder: "asc" }, { questionNo: "asc" }],
      });
    });
  }

  return questions;
}
