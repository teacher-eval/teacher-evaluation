"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import { logError } from "@/lib/logger";
import { requireRole } from "@/lib/rbac";

export type SettingsActionState = {
  ok: boolean;
  message?: string;
};

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
    revalidatePath("/admin/reports");
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

    await prisma.evaluationSetting.update({
      where: { id },
      data: {
        academicYear,
        semester,
        startDate: start,
        endDate: end,
      },
    });

    revalidatePath("/admin/evaluation-settings");
    revalidatePath("/admin/reports");
    revalidatePath("/student");

    return { ok: true, message: "Evaluation period updated successfully!" };
  } catch (error) {
    logError("updateEvaluationPeriodAction", {
      error: error instanceof Error ? error.message : String(error),
    });
    return { ok: false, message: "Failed to update evaluation period." };
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
