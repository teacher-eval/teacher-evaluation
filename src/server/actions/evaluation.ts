"use server";

import { revalidatePath } from "next/cache";

import type { RatingLabel } from "@/generated/prisma/enums";
import { todayIso } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { logError } from "@/lib/logger";
import { requireRole } from "@/lib/rbac";

export type EvaluationFormState = {
  ok: boolean;
  message?: string;
  /** Which criterion failed client-side validation, for focus handling. */
  field?: string;
};

const RATING_MAP: Record<number, RatingLabel> = {
  5: "outstanding",
  4: "very_satisfactory",
  3: "satisfactory",
  2: "needs_improvements",
  1: "poor",
};

/**
 * Handles the same checks in the same order as submit_evaluation.php:
 * active period → subject belongs to this student's section → all criteria
 * rated 1..5 → no duplicate for the day → insert.
 */
export async function submitEvaluationAction(
  _prev: EvaluationFormState,
  formData: FormData,
): Promise<EvaluationFormState> {
  const user = await requireRole("student");

  const teacherId = Number(formData.get("teacher_id"));
  const subjectId = Number(formData.get("subject_id"));

  if (!Number.isInteger(teacherId) || !Number.isInteger(subjectId)) {
    return { ok: false, message: "Invalid subject or teacher selection." };
  }

  const [student, activeEvaluation, questions] = await Promise.all([
    prisma.student.findUnique({
      where: { userId: user.id },
      select: { course: true, yearLevel: true },
    }),
    prisma.evaluationSetting.findFirst({
      where: { isActive: true },
      orderBy: { id: "desc" },
    }),
    prisma.evaluationQuestion.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { questionNo: "asc" }],
      select: { questionNo: true },
    }),
  ]);

  if (!student) {
    return { ok: false, message: "Student record not found." };
  }

  if (
    !activeEvaluation ||
    activeEvaluation.startDate > new Date(`${todayIso()}T00:00:00Z`) ||
    activeEvaluation.endDate < new Date(`${todayIso()}T00:00:00Z`)
  ) {
    return { ok: false, message: "Evaluation period is not currently active." };
  }

  // Row-level security: the subject must belong to the chosen teacher and to
  // the student's own course/year level.
  const subject = await prisma.subject.findFirst({
    where: {
      id: subjectId,
      teacherId,
      course: student.course,
      yearLevel: student.yearLevel,
      status: "active",
    },
    select: { subjectName: true, course: true },
  });

  if (!subject) {
    return { ok: false, message: "Unauthorized: invalid subject or teacher selection." };
  }

  const ratings: number[] = [];
  for (const question of questions) {
    const key = `q${question.questionNo}`;
    const raw = formData.get(key);
    if (raw === null || raw === "") {
      return {
        ok: false,
        message: `Please provide a rating for all criteria (Criterion ${question.questionNo} missing).`,
        field: key,
      };
    }
    const value = Number(raw);
    if (!Number.isInteger(value) || value < 1 || value > 5) {
      return {
        ok: false,
        message: `Invalid rating value for criterion ${question.questionNo}. Must be between 1 and 5.`,
        field: key,
      };
    }
    ratings.push(value);
  }

  if (ratings.length === 0) {
    return { ok: false, message: "The evaluation form has no active criteria." };
  }

  // Column is varchar(150): "Subject name - COURSE".
  const subjectInfo = `${subject.subjectName} - ${subject.course}`;

  const commentRaw = String(formData.get("comment") ?? "").trim();
  if (commentRaw.length > 500) {
    return { ok: false, message: "Comments must be 500 characters or fewer.", field: "comment" };
  }
  const comment = commentRaw.length > 0 ? filterComment(commentRaw) : null;

  const average = Math.round(ratings.reduce((sum, value) => sum + value, 0) / ratings.length);
  const feels = RATING_MAP[average] ?? "satisfactory";

  const date = new Date(`${todayIso()}T00:00:00Z`);

  // Fast path for the friendly message; the unique index is the real guard.
  const duplicate = await prisma.reaction.findFirst({
    where: { studId: user.id, teacherId, subject: subjectInfo, date },
    select: { id: true },
  });

  if (duplicate) {
    return {
      ok: false,
      message: "You have already evaluated this teacher for this subject today.",
    };
  }

  try {
    await prisma.reaction.create({
      data: {
        studId: user.id, // always the session user, never form input
        teacherId,
        subject: subjectInfo,
        q1: ratings[0] ?? 0,
        q2: ratings[1] ?? 0,
        q3: ratings[2] ?? 0,
        q4: ratings[3] ?? 0,
        q5: ratings[4] ?? 0,
        q6: ratings[5] ?? 0,
        q7: ratings[6] ?? 0,
        q8: ratings[7] ?? 0,
        q9: ratings[8] ?? 0,
        q10: ratings[9] ?? 0,
        feels,
        comments: comment,
        date,
      },
    });
  } catch (error) {
    // P2002: someone double-submitted; the unique index rejected it.
    if (isUniqueViolation(error)) {
      return {
        ok: false,
        message: "You have already evaluated this teacher for this subject today.",
      };
    }
    logError("evaluation.insert_failed", { userId: user.id });
    return { ok: false, message: "Failed to submit evaluation. Please try again." };
  }

  revalidatePath("/student");
  revalidatePath("/admin/reports");
  revalidatePath("/admin");
  revalidatePath("/teacher");
  return { ok: true, message: "Evaluation submitted successfully." };
}

/**
 * Matches filterComment() in the PHP helpers: a placeholder word list.
 * Kept identical so behaviour, including its limitations, is preserved.
 */
function filterComment(comment: string): string {
  const badWords = ["badword1", "badword2"];
  let output = comment;
  for (const word of badWords) {
    output = output.replace(
      new RegExp(escapeRegExp(word), "gi"),
      "*".repeat(word.length),
    );
  }
  return output;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  );
}
