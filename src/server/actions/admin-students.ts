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

export type PromotionActionState = {
  ok: boolean;
  message?: string;
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

/**
 * Bulk year-level rollover. The admin picks the target academic year and the
 * exact students; every eligible student moves 1 → 2, 2 → 3, and 3 graduates
 * (account stays usable, but the student leaves the active lists).
 *
 * `lastPromotedAcademicYear` is the idempotency guard: re-submitting the same
 * year skips everyone who was already rolled over. No enrollment table is
 * involved — this is only a bulk edit of `students.year_level`.
 */
export async function promoteStudentsAction(
  _prev: PromotionActionState,
  formData: FormData,
): Promise<PromotionActionState> {
  await requireRole("admin");

  const academicYear = text(formData.get("academic_year"));
  if (!/^\d{4}-\d{4}$/.test(academicYear)) {
    return { ok: false, message: "Please choose a valid academic year (YYYY-YYYY)." };
  }

  const studentIds = [
    ...new Set(
      formData
        .getAll("student_ids")
        .map((value) => Number.parseInt(String(value), 10))
        .filter((value) => Number.isInteger(value) && value > 0),
    ),
  ];

  if (studentIds.length === 0) {
    return { ok: false, message: "Select at least one student to promote." };
  }

  const eligible = await prisma.student.findMany({
    where: {
      id: { in: studentIds },
      status: "active",
      graduatedAt: null,
      user: { status: "active" },
    },
    select: { id: true, yearLevel: true, lastPromotedAcademicYear: true },
  });

  if (eligible.length === 0) {
    return {
      ok: false,
      message: "None of the selected students are eligible for promotion.",
    };
  }

  let promoted = 0;
  let graduated = 0;
  let skipped = studentIds.length - eligible.length;

  const updates: ReturnType<typeof prisma.student.update>[] = [];

  for (const student of eligible) {
    // Never move a student backwards into a year they were already rolled into.
    if (
      student.lastPromotedAcademicYear !== null &&
      student.lastPromotedAcademicYear >= academicYear
    ) {
      skipped += 1;
      continue;
    }

    if (student.yearLevel >= 3) {
      updates.push(
        prisma.student.update({
          where: { id: student.id },
          data: {
            graduatedAt: new Date(),
            status: "inactive",
            lastPromotedAcademicYear: academicYear,
          },
        }),
      );
      graduated += 1;
      continue;
    }

    updates.push(
      prisma.student.update({
        where: { id: student.id },
        data: {
          yearLevel: student.yearLevel + 1,
          lastPromotedAcademicYear: academicYear,
        },
      }),
    );
    promoted += 1;
  }

  if (updates.length === 0) {
    return {
      ok: false,
      message: `No changes for AY ${academicYear} — ${skipped} student(s) were already rolled over.`,
    };
  }

  try {
    await prisma.$transaction(updates);
  } catch {
    logError("admin.student_promotion_failed", { academicYear, count: updates.length });
    return { ok: false, message: "Failed to promote students. Please try again." };
  }

  logAudit("admin.students_promoted", { academicYear, promoted, graduated, skipped });
  revalidatePath("/admin/students");
  revalidatePath("/admin");
  revalidatePath("/student");

  const parts = [`${promoted} promoted`, `${graduated} graduated`];
  if (skipped > 0) parts.push(`${skipped} skipped`);

  return { ok: true, message: `AY ${academicYear}: ${parts.join(" · ")}.` };
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
