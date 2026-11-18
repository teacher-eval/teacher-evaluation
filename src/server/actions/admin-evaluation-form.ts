"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import { logError } from "@/lib/logger";
import { requireRole } from "@/lib/rbac";

export type SaveQuestionsState = {
  ok: boolean;
  message?: string;
};

export async function saveEvaluationQuestionsAction(
  _prev: SaveQuestionsState,
  formData: FormData,
): Promise<SaveQuestionsState> {
  try {
    await requireRole("admin");

    const rawTexts = formData.getAll("question_text");
    const cleanTexts: string[] = [];

    for (const raw of rawTexts) {
      if (typeof raw === "string") {
        const trimmed = raw.trim();
        if (trimmed.length > 0) {
          if (trimmed.length > 500) {
            return {
              ok: false,
              message: "Each criterion must be 500 characters or fewer.",
            };
          }
          cleanTexts.push(trimmed);
        }
      }
    }

    if (cleanTexts.length === 0) {
      return { ok: false, message: "No questions provided. Please add at least 1 criterion." };
    }

    if (cleanTexts.length > 10) {
      return {
        ok: false,
        message:
          "You can only have a maximum of 10 evaluation criteria due to database limitations.",
      };
    }

    await prisma.$transaction(async (tx) => {
      // Clear existing questions
      await tx.evaluationQuestion.deleteMany();

      // Create new questions in order
      for (let i = 0; i < cleanTexts.length; i++) {
        await tx.evaluationQuestion.create({
          data: {
            questionNo: i + 1,
            questionText: cleanTexts[i],
            sortOrder: i + 1,
            isActive: true,
          },
        });
      }
    });

    revalidatePath("/admin/evaluation-form");
    revalidatePath("/student");

    return {
      ok: true,
      message: "Evaluation form updated successfully!",
    };
  } catch (error) {
    logError("saveEvaluationQuestionsAction", {
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      ok: false,
      message: "Failed to save questions. Please try again.",
    };
  }
}
