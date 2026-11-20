"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import { logAudit, logError } from "@/lib/logger";
import { requireRole } from "@/lib/rbac";

/**
 * Admin student management, ported from handleStudentActions() in
 * backend/controllers/AdminController.php.
 *
 * Students create their own accounts through /register, so there is no "add"
 * action here. The legacy edit form also offered `pending_2fa`, but the server
 * only accepted active/inactive and `students.status` is an active/inactive
 * enum, so the option is not carried over.
 */

export type StudentFormValues = {
  username?: string;
  fullName?: string;
  course?: string;
  yearLevel?: string;
  status?: string;
};

export type StudentFormState = {
  ok: boolean;
  message?: string;
  values?: StudentFormValues;
};

export type ActionResult = {
  ok: boolean;
  message: string;
};

const USERNAME_PATTERN = /^[A-Za-z0-9_]{3,50}$/;

export async function updateStudentAction(
  _prev: StudentFormState,
  formData: FormData,
): Promise<StudentFormState> {
  await requireRole("admin");

  const id = Number.parseInt(text(formData.get("id")), 10);
  const username = text(formData.get("username"));
  const fullName = text(formData.get("full_name"));
  const course = text(formData.get("course"));
  const yearLevel = Number.parseInt(text(formData.get("year_level")), 10);
  const status = text(formData.get("status"));

  const values: StudentFormValues = {
    username,
    fullName,
    course,
    yearLevel: Number.isFinite(yearLevel) ? String(yearLevel) : "",
    status,
  };

  if (!Number.isInteger(id) || id <= 0) {
    return { ok: false, message: "Invalid student.", values };
  }

  if (!USERNAME_PATTERN.test(username)) {
    return {
      ok: false,
      message: "Username must be 3-50 characters: letters, numbers, underscores only.",
      values,
    };
  }

  if (!isValidFullName(fullName)) {
    return { ok: false, message: "Full name must be between 2 and 100 characters.", values };
  }

  if (course.length === 0) {
    return { ok: false, message: "Please select a course.", values };
  }

  if (!(yearLevel >= 1 && yearLevel <= 3)) {
    return { ok: false, message: "Please select a valid year level (1-3).", values };
  }

  if (status !== "active" && status !== "inactive") {
    return { ok: false, message: "Invalid account status.", values };
  }

  const target = await prisma.user.findFirst({
    where: { id, role: "student" },
    select: { student: { select: { id: true } } },
  });
  if (!target?.student) {
    return { ok: false, message: "Student not found.", values };
  }

  const duplicate = await prisma.user.findFirst({
    where: {
      username: { equals: username, mode: "insensitive" },
      id: { not: id },
    },
    select: { id: true },
  });
  if (duplicate) {
    return {
      ok: false,
      message: `Username '${username}' is already taken by another user.`,
      values,
    };
  }

  try {
    await prisma.$transaction([
      prisma.user.update({
        where: { id },
        data: { username, fullName, status },
      }),
      prisma.student.update({
        where: { userId: id },
        data: {
          course,
          yearLevel,
          status: status === "active" ? "active" : "inactive",
          // Re-activating a graduate turns them back into a regular student.
          graduatedAt: status === "active" ? null : undefined,
          // Reset semesters completed based on the manual year level setting
          semestersCompleted: (yearLevel - 1) * 2,
          lastPromotedAcademicYear: null,
        },
      }),
    ]);
  } catch {
    logError("admin.student_update_failed", { userId: id });
    return { ok: false, message: "Failed to update student.", values };
  }

  logAudit("admin.student_updated", { userId: id });
  revalidatePath("/admin/students");
  revalidatePath("/admin");

  return { ok: true, message: "Student updated successfully!" };
}

export async function deleteStudentAction(userId: number): Promise<ActionResult> {
  await requireRole("admin");

  if (!Number.isInteger(userId) || userId <= 0) {
    return { ok: false, message: "Invalid student." };
  }

  const target = await prisma.user.findFirst({
    where: { id: userId, role: "student" },
    select: { id: true },
  });
  if (!target) {
    return { ok: false, message: "Student not found." };
  }

  try {
    // Cascades remove the student row and their evaluation records.
    await prisma.user.delete({ where: { id: userId } });
  } catch {
    logError("admin.student_delete_failed", { userId });
    return { ok: false, message: "Failed to delete student." };
  }

  logAudit("admin.student_deleted", { userId });
  revalidatePath("/admin/students");
  revalidatePath("/admin");

  return { ok: true, message: "Student deleted successfully!" };
}

function text(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

function isValidFullName(value: string): boolean {
  const length = Array.from(value.trim()).length;
  return length >= 2 && length <= 100;
}
