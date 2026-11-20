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
 * Automatically advances student year levels when an evaluation period for a new
 * academic year is activated or created.
 *
 * Rules:
 * - Active students registered before this period's startDate whose
 *   `lastPromotedAcademicYear` is older than `academicYear` (or null):
 *   - Year 1 -> Year 2
 *   - Year 2 -> Year 3
 *   - Year 3 -> Graduated (status: inactive, graduatedAt: now)
 * - Students who registered on or after this period's startDate:
 *   - Stamped with `lastPromotedAcademicYear = academicYear` so they are not bumped
 *     while this academic year is ongoing.
 */
export async function autoAdvanceStudents(
  tx: Prisma.TransactionClient,
  academicYear: string,
  startDate: Date,
) {
  const eligible = await tx.student.findMany({
    where: {
      status: "active",
      graduatedAt: null,
      user: { status: "active" },
      OR: [
        { lastPromotedAcademicYear: null },
        { lastPromotedAcademicYear: { lt: academicYear } },
      ],
    },
    select: {
      id: true,
      yearLevel: true,
      createdAt: true,
      lastPromotedAcademicYear: true,
    },
  });

  for (const student of eligible) {
    const isNewEntrant = student.createdAt >= startDate;

    if (isNewEntrant) {
      await tx.student.update({
        where: { id: student.id },
        data: { lastPromotedAcademicYear: academicYear },
      });
      continue;
    }

    if (student.yearLevel >= 3) {
      await tx.student.update({
        where: { id: student.id },
        data: {
          graduatedAt: new Date(),
          status: "inactive",
          lastPromotedAcademicYear: academicYear,
        },
      });
    } else {
      await tx.student.update({
        where: { id: student.id },
        data: {
          yearLevel: student.yearLevel + 1,
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

        // Auto-advance eligible students to the new academic year
        await autoAdvanceStudents(tx, academicYear, start);
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
        select: { isActive: true, academicYear: true },
      });

      if (existing?.isActive && academicYear !== existing.academicYear) {
        await autoAdvanceStudents(tx, academicYear, start);
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

      await autoAdvanceStudents(tx, target.academicYear, target.startDate);
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
