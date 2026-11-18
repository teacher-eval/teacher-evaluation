import { prisma } from "@/lib/db";
import { DEFAULT_QUESTIONS, type QuestionItem } from "@/lib/evaluation-defaults";

export { DEFAULT_QUESTIONS, type QuestionItem };

export async function getEvaluationQuestions(): Promise<QuestionItem[]> {
  const questions = await prisma.evaluationQuestion.findMany({
    orderBy: [{ sortOrder: "asc" }, { questionNo: "asc" }],
  });

  if (questions.length === 0) {
    // If none exist yet, seed the defaults
    await prisma.$transaction(
      DEFAULT_QUESTIONS.map((text, idx) =>
        prisma.evaluationQuestion.create({
          data: {
            questionNo: idx + 1,
            questionText: text,
            sortOrder: idx + 1,
            isActive: true,
          },
        }),
      ),
    );

    return prisma.evaluationQuestion.findMany({
      orderBy: [{ sortOrder: "asc" }, { questionNo: "asc" }],
    });
  }

  return questions;
}
