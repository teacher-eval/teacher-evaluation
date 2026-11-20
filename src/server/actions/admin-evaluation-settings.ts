"use server";

import { revalidatePath } from "next/cache";

import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { logError } from "@/lib/logger";
import { requireRole } from "@/lib/rbac";

export type SettingsActionState = {
  ok: boolean;
  message?: string;
};

/**
 * Automatically advances student progress when an evaluation period is activated or created.
 *
 * Rules:
 * - Each year level consists of 2 semesters (6 semesters total to graduate).
 * - When a new evaluation period is activated (e.g. "2026-2027_2nd", "2027-2028_1st"):
 *   - Students who enrolled during this new period (`createdAt >= startDate`) start fresh
 *     with their registered year level and are stamped with `lastCompletedPeriodKey = periodKey`.
 *   - Active students who were already enrolled (`lastCompletedPeriodKey !== periodKey` and `createdAt < startDate`):
 *     - `semestersCompleted += 1`
 *     - If `semestersCompleted >= 6`:
 *       - `graduatedAt = new Date()`
 *       - `status = "inactive"`
 *     - Else:
 *       - `yearLevel = 1 + Math.floor(semestersCompleted / 2)` (capped at 3)
 *     - `lastCompletedPeriodKey = periodKey`
 */
export async function advanceStudentsForPeriod(
  tx: Prisma.TransactionClient,
  academicYear: string,
  semester: string,
  startDate: Date,
) {
  const periodKey = `${academicYear}_${semester}`;

  const eligible = await tx.student.findMany({
    where: {
      status: "active",
      graduatedAt: null,
      user: { status: "active" },
      OR: [
        { lastCompletedPeriodKey: null },
        { lastCompletedPeriodKey: { not: periodKey } },
      ],
    },
    select: {
      id: true,
      yearLevel: true,
      semestersCompleted: true,
      createdAt: true,
      lastCompletedPeriodKey: true,
    },
  });

  for (const student of eligible) {
    const isNewEntrant = student.createdAt >= startDate;

    if (isNewEntrant) {
      await tx.student.update({
        where: { id: student.id },
        data: {
          lastCompletedPeriodKey: periodKey,
          lastPromotedAcademicYear: academicYear,
        },
      });
      continue;
    }

    const nextCompleted = student.semestersCompleted + 1;

    if (nextCompleted >= 6) {
      await tx.student.update({
        where: { id: student.id },
        data: {
          semestersCompleted: nextCompleted,
          yearLevel: 3,
          graduatedAt: new Date(),
          status: "inactive",
          lastCompletedPeriodKey: periodKey,
          lastPromotedAcademicYear: academicYear,
        },
      });
    } else {
      const nextYearLevel = Math.min(3, 1 + Math.floor(nextCompleted / 2));
      await tx.student.update({
        where: { id: student.id },
        data: {
          semestersCompleted: nextCompleted,
          yearLevel: nextYearLevel,
          lastCompletedPeriodKey: periodKey,
          lastPromotedAcademicYear: academicYear,
        },
      });
    }
  }
}

export async function createEvaluationPeriodAction(
  _prev: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  try {
    await requireRole("admin");

    const academicYear = String(formData.get("academic_year") || "").trim();
    const semester = String(formData.get("semester") || "").trim();
    const startDateRaw = String(formData.get("start_date") || "").trim();
    const endDateRaw = String(formData.get("end_date") || "").trim();
    const isActive = formData.get("is_active") === "1" || formData.get("is_active") === "true";

    if (!academicYear || !semester || !startDateRaw || !endDateRaw) {
      return { ok: false, message: "All fields are required." };
    }

    if (!["1st", "2nd", "Summer"].includes(semester)) {
      return { ok: false, message: "Invalid semester value." };
    }

    if (!/^\d{4}-\d{4}$/.test(academicYear)) {
      return {
        ok: false,
        message: "Academic year must be in YYYY-YYYY format (e.g. 2025-2026).",
      };
    }

    const start = new Date(`${startDateRaw}T00:00:00Z`);
    const end = new Date(`${endDateRaw}T00:00:00Z`);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return { ok: false, message: "Invalid date format." };
    }

    if (end < start) {
      return { ok: false, message: "End date must be after start date." };
    }

    await prisma.$transaction(async (tx) => {
      if (isActive) {
        await tx.evaluationSetting.updateMany({
          data: { isActive: false },
        });

        // Auto-advance eligible students to the new semester/year
        await advanceStudentsForPeriod(tx, academicYear, semester, start);
      }

      await tx.evaluationSetting.create({
        data: {
          academicYear,
          semester,
          startDate: start,
          endDate: end,
          isActive,
        },
      });
    });

    revalidatePath("/admin/evaluation-settings");
    revalidatePath("/admin/students");
    revalidatePath("/admin/reports");
    revalidatePath("/admin");
    revalidatePath("/student");

    return { ok: true, message: "Evaluation period configured successfully!" };
  } catch (error) {
    logError("createEvaluationPeriodAction", {
      error: error instanceof Error ? error.message : String(error),
    });
    return { ok: false, message: "Failed to create evaluation period. Please try again." };
  }
}

export async function updateEvaluationPeriodAction(
  _prev: SettingsActionState,
  formData: FormData,
): Promise<SettingsActionState> {
  try {
    await requireRole("admin");

    const id = Number(formData.get("id"));
    const academicYear = String(formData.get("academic_year") || "").trim();
    const semester = String(formData.get("semester") || "").trim();
    const startDateRaw = String(formData.get("start_date") || "").trim();
    const endDateRaw = String(formData.get("end_date") || "").trim();

    if (!id || !academicYear || !semester || !startDateRaw || !endDateRaw) {
      return { ok: false, message: "All fields are required." };
    }

    if (!["1st", "2nd", "Summer"].includes(semester)) {
      return { ok: false, message: "Invalid semester value." };
    }

    if (!/^\d{4}-\d{4}$/.test(academicYear)) {
      return {
        ok: false,
        message: "Academic year must be in YYYY-YYYY format (e.g. 2025-2026).",
      };
    }

    const start = new Date(`${startDateRaw}T00:00:00Z`);
    const end = new Date(`${endDateRaw}T00:00:00Z`);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return { ok: false, message: "Invalid date format." };
    }

    if (end < start) {
      return { ok: false, message: "End date must be after start date." };
    }

    await prisma.$transaction(async (tx) => {
      const existing = await tx.evaluationSetting.findUnique({
        where: { id },
        select: { isActive: true, academicYear: true, semester: true },
      });

      if (
        existing?.isActive &&
        (academicYear !== existing.academicYear || semester !== existing.semester)
      ) {
        await advanceStudentsForPeriod(tx, academicYear, semester, start);
      }

      await tx.evaluationSetting.update({
        where: { id },
        data: {
          academicYear,
          semester,
          startDate: start,
          endDate: end,
        },
      });
    });

    revalidatePath("/admin/evaluation-settings");
    revalidatePath("/admin/students");
    revalidatePath("/admin/reports");
    revalidatePath("/admin");
    revalidatePath("/student");

    return { ok: true, message: "Evaluation period updated successfully!" };
  } catch (error) {
    logError("updateEvaluationPeriodAction", {
      error: error instanceof Error ? error.message : String(error),
    });
    return { ok: false, message: "Failed to update evaluation period." };
  }
}

export async function activateEvaluationPeriodAction(
  id: number,
): Promise<SettingsActionState> {
  try {
    await requireRole("admin");

    const target = await prisma.evaluationSetting.findUnique({
      where: { id },
    });

    if (!target) {
      return { ok: false, message: "Evaluation period not found." };
    }

    await prisma.$transaction(async (tx) => {
      await tx.evaluationSetting.updateMany({
        data: { isActive: false },
      });

      await tx.evaluationSetting.update({
        where: { id },
        data: { isActive: true },
      });

      await advanceStudentsForPeriod(tx, target.academicYear, target.semester, target.startDate);
    });

    revalidatePath("/admin/evaluation-settings");
    revalidatePath("/admin/students");
    revalidatePath("/admin/reports");
    revalidatePath("/admin");
    revalidatePath("/student");

    return {
      ok: true,
      message: `AY ${target.academicYear} activated and student year levels updated!`,
    };
  } catch (error) {
    logError("activateEvaluationPeriodAction", {
      error: error instanceof Error ? error.message : String(error),
    });
    return { ok: false, message: "Failed to activate evaluation period." };
  }
}

export async function terminateEvaluationPeriodAction(): Promise<SettingsActionState> {
  try {
    await requireRole("admin");

    await prisma.evaluationSetting.updateMany({
      data: { isActive: false },
    });

    revalidatePath("/admin/evaluation-settings");
    revalidatePath("/admin/reports");
    revalidatePath("/student");

    return { ok: true, message: "Evaluation period ended successfully!" };
  } catch (error) {
    logError("terminateEvaluationPeriodAction", {
      error: error instanceof Error ? error.message : String(error),
    });
    return { ok: false, message: "Failed to end evaluation period." };
  }
}

export async function deleteEvaluationPeriodAction(
  id: number,
): Promise<SettingsActionState> {
  try {
    await requireRole("admin");

    const existing = await prisma.evaluationSetting.findUnique({
      where: { id },
    });

    if (!existing) {
      return { ok: false, message: "Evaluation period not found." };
    }

    if (existing.isActive) {
      return {
        ok: false,
        message: "Cannot delete an active evaluation period. Please end it first.",
      };
    }

    await prisma.evaluationSetting.delete({
      where: { id },
    });

    revalidatePath("/admin/evaluation-settings");
    revalidatePath("/admin/reports");
    revalidatePath("/student");

    return { ok: true, message: "Evaluation period deleted successfully!" };
  } catch (error) {
    logError("deleteEvaluationPeriodAction", {
      error: error instanceof Error ? error.message : String(error),
    });
    return { ok: false, message: "Failed to delete evaluation period." };
  }
}
