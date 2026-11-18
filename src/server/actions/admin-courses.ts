"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import { logAudit, logError } from "@/lib/logger";
import { requireRole } from "@/lib/rbac";

/**
 * Admin course CRUD, ported from handleCourseActions() in
 * backend/controllers/AdminController.php.
 *
 * Course codes are stored on students and subjects as plain strings (there is
 * no foreign key), so renaming a code leaves those rows untouched — the same
 * behaviour as the PHP app.
 */

export type CourseFormValues = {
  courseCode?: string;
  courseName?: string;
};

export type CourseFormState = {
  ok: boolean;
  message?: string;
  values?: CourseFormValues;
};

export type ActionResult = {
  ok: boolean;
  message: string;
};

/** Same rule as the PHP controller: 2-10 chars, letters/numbers/space/hyphen. */
const COURSE_CODE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9\- ]{1,9}$/;

export async function addCourseAction(
  _prev: CourseFormState,
  formData: FormData,
): Promise<CourseFormState> {
  await requireRole("admin");

  const courseCode = text(formData.get("course_code"));
  const courseName = text(formData.get("course_name"));
  const values: CourseFormValues = { courseCode, courseName };

  const invalid = validate(courseCode, courseName);
  if (invalid) return { ok: false, message: invalid, values };

  const duplicate = await prisma.course.findFirst({
    where: { courseCode: { equals: courseCode, mode: "insensitive" } },
    select: { id: true },
  });
  if (duplicate) {
    return { ok: false, message: `Course code '${courseCode}' already exists.`, values };
  }

  try {
    await prisma.course.create({ data: { courseCode, courseName } });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return {
        ok: false,
        message: `Course code '${courseCode}' already exists.`,
        values,
      };
    }
    logError("admin.course_create_failed", { courseCode });
    return { ok: false, message: "Failed to add course. Course code may already exist.", values };
  }

  logAudit("admin.course_created", { courseCode });
  revalidatePath("/admin/courses");
  revalidatePath("/admin");

  return { ok: true, message: "Course added successfully!" };
}

export async function updateCourseAction(
  _prev: CourseFormState,
  formData: FormData,
): Promise<CourseFormState> {
  await requireRole("admin");

  const id = Number.parseInt(text(formData.get("id")), 10);
  const courseCode = text(formData.get("course_code"));
  const courseName = text(formData.get("course_name"));
  const values: CourseFormValues = { courseCode, courseName };

  if (!Number.isInteger(id) || id <= 0) {
    return { ok: false, message: "Invalid course.", values };
  }

  const invalid = validate(courseCode, courseName);
  if (invalid) return { ok: false, message: invalid, values };

  const target = await prisma.course.findUnique({ where: { id }, select: { id: true } });
  if (!target) {
    return { ok: false, message: "Course not found.", values };
  }

  const duplicate = await prisma.course.findFirst({
    where: {
      courseCode: { equals: courseCode, mode: "insensitive" },
      id: { not: id },
    },
    select: { id: true },
  });
  if (duplicate) {
    return { ok: false, message: `Course code '${courseCode}' already exists.`, values };
  }

  try {
    await prisma.course.update({ where: { id }, data: { courseCode, courseName } });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return {
        ok: false,
        message: `Course code '${courseCode}' already exists.`,
        values,
      };
    }
    logError("admin.course_update_failed", { courseId: id });
    return { ok: false, message: "Failed to update course.", values };
  }

  logAudit("admin.course_updated", { courseId: id, courseCode });
  revalidatePath("/admin/courses");
  revalidatePath("/admin");

  return { ok: true, message: "Course updated successfully!" };
}

export async function deleteCourseAction(courseId: number): Promise<ActionResult> {
  await requireRole("admin");

  if (!Number.isInteger(courseId) || courseId <= 0) {
    return { ok: false, message: "Invalid course." };
  }

  const target = await prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true },
  });
  if (!target) {
    return { ok: false, message: "Course not found." };
  }

  try {
    await prisma.course.delete({ where: { id: courseId } });
  } catch {
    logError("admin.course_delete_failed", { courseId });
    return { ok: false, message: "Failed to delete course." };
  }

  logAudit("admin.course_deleted", { courseId });
  revalidatePath("/admin/courses");
  revalidatePath("/admin");

  return { ok: true, message: "Course deleted successfully!" };
}

function validate(courseCode: string, courseName: string): string | null {
  if (!COURSE_CODE_PATTERN.test(courseCode)) {
    return "Course code must be 2-10 characters: letters, numbers, spaces or hyphens.";
  }
  if (courseName.length === 0 || Array.from(courseName).length > 100) {
    return "Course name is required and must be at most 100 characters.";
  }
  return null;
}

function text(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  );
}
