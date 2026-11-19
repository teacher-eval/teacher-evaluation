"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db";
import { logAudit, logError } from "@/lib/logger";
import { requireRole } from "@/lib/rbac";
import { deleteTeacherAvatar, uploadTeacherAvatar } from "@/lib/storage";
import { hashPassword } from "@/server/auth/password";
import type { TeacherSubject } from "@/server/queries/admin-teachers";

/**
 * Admin teacher CRUD, ported from handleTeacherActions() in
 * backend/controllers/AdminController.php.
 *
 * Validation messages are kept word-for-word so the screens read the same as
 * the PHP app. Every action re-checks the admin role: server actions are
 * reachable by direct POST, so the layout guard is not enough.
 */

export type TeacherFormValues = {
  username?: string;
  fullName?: string;
  status?: string;
  course?: string;
  yearLevel?: string;
  subjectName?: string;
};

export type TeacherFormState = {
  ok: boolean;
  message?: string;
  values?: TeacherFormValues;
  /** Present after subject mutations so the open modal can refresh in place. */
  subjects?: TeacherSubject[];
};

export type ActionResult = {
  ok: boolean;
  message: string;
};

const USERNAME_PATTERN = /^[A-Za-z0-9_]{3,50}$/;

export async function addTeacherAction(
  _prev: TeacherFormState,
  formData: FormData,
): Promise<TeacherFormState> {
  await requireRole("admin");

  const username = text(formData.get("username"));
  const fullName = text(formData.get("full_name"));
  const password = String(formData.get("password") ?? "");
  const subjectName = text(formData.get("subject_name"));
  const course = text(formData.get("course"));
  const yearLevel = Number.parseInt(text(formData.get("year_level")), 10);

  const values: TeacherFormValues = {
    username,
    fullName,
    course,
    yearLevel: Number.isFinite(yearLevel) ? String(yearLevel) : "",
    subjectName,
  };

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

  if (password.length < 8) {
    return { ok: false, message: "Password must be at least 8 characters.", values };
  }

  const duplicateUser = await prisma.user.findFirst({
    where: { username: { equals: username, mode: "insensitive" } },
    select: { id: true },
  });
  if (duplicateUser) {
    return {
      ok: false,
      message: `Username '${username}' is already taken. Please choose a different username.`,
      values,
    };
  }

  const duplicateTeacher = await prisma.user.findFirst({
    where: {
      role: "teacher",
      fullName: { equals: fullName, mode: "insensitive" },
    },
    select: { username: true },
  });
  if (duplicateTeacher) {
    return {
      ok: false,
      message: `A teacher named '${fullName}' already exists (Username: ${duplicateTeacher.username}). Please manage subjects on the existing teacher instead of adding a duplicate.`,
      values,
    };
  }

  const hasSubject = subjectName.length > 0;
  if (hasSubject && Array.from(subjectName).length > 100) {
    return {
      ok: false,
      message: "Subject name must be at most 100 characters.",
      values,
    };
  }
  if (hasSubject && !(await isValidCourse(course))) {
    return { ok: false, message: "Please choose a valid course for the subject.", values };
  }
  if (hasSubject && !(yearLevel >= 1 && yearLevel <= 3)) {
    return { ok: false, message: "Please choose a valid year level for the subject.", values };
  }

  const uploaded = await stageAvatar(formData);
  if (!uploaded.ok) {
    return { ok: false, message: `Profile image: ${uploaded.error}`, values };
  }

  const passwordHash = await hashPassword(password);

  try {
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { username, password: passwordHash, fullName, role: "teacher" },
      });
      const teacher = await tx.teacher.create({
        data: { userId: user.id, department: "TVET", profileImage: uploaded.path },
      });
      if (hasSubject) {
        await tx.subject.create({
          data: { subjectName, course, yearLevel, teacherId: teacher.id },
        });
      }
    });
  } catch (error) {
    await deleteTeacherAvatar(uploaded.path);
    if (isUniqueViolation(error)) {
      return {
        ok: false,
        message: "Failed to add teacher. Username or Subject Name/Code may already exist.",
        values,
      };
    }
    logError("admin.teacher_create_failed", { username });
    return { ok: false, message: "Failed to add teacher. Database error.", values };
  }

  logAudit("admin.teacher_created", { username });
  revalidatePath("/admin/teachers");
  revalidatePath("/admin");

  return { ok: true, message: "Teacher and initial subject added successfully!" };
}

export async function updateTeacherAction(
  _prev: TeacherFormState,
  formData: FormData,
): Promise<TeacherFormState> {
  await requireRole("admin");

  const id = Number.parseInt(text(formData.get("id")), 10);
  const username = text(formData.get("username"));
  const fullName = text(formData.get("full_name"));
  const status = text(formData.get("status"));
  const rawPassword = text(formData.get("password"));

  const values: TeacherFormValues = { username, fullName, status };

  if (!Number.isInteger(id) || id <= 0) {
    return { ok: false, message: "Invalid teacher.", values };
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

  if (status !== "active" && status !== "inactive") {
    return { ok: false, message: "Invalid account status.", values };
  }

  const password = rawPassword.length > 0 ? rawPassword : null;
  if (password !== null && password.length < 8) {
    return { ok: false, message: "Password must be at least 8 characters.", values };
  }

  const target = await prisma.user.findFirst({
    where: { id, role: "teacher" },
    select: { id: true, teacher: { select: { profileImage: true } } },
  });
  if (!target) {
    return { ok: false, message: "Teacher not found.", values };
  }

  const duplicateUser = await prisma.user.findFirst({
    where: {
      username: { equals: username, mode: "insensitive" },
      id: { not: id },
    },
    select: { id: true },
  });
  if (duplicateUser) {
    return {
      ok: false,
      message: `Username '${username}' is already taken by another user.`,
      values,
    };
  }

  const duplicateTeacher = await prisma.user.findFirst({
    where: {
      role: "teacher",
      id: { not: id },
      fullName: { equals: fullName, mode: "insensitive" },
    },
    select: { username: true },
  });
  if (duplicateTeacher) {
    return {
      ok: false,
      message: `A teacher named '${fullName}' already exists (Username: ${duplicateTeacher.username}). Duplicate teacher profiles are not allowed.`,
      values,
    };
  }

  const uploaded = await stageAvatar(formData);
  if (!uploaded.ok) {
    return { ok: false, message: `Profile image: ${uploaded.error}`, values };
  }

  const oldImage = target.teacher?.profileImage ?? null;
  const passwordHash = password !== null ? await hashPassword(password) : null;

  try {
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: {
          username,
          fullName,
          status,
          ...(passwordHash !== null ? { password: passwordHash } : {}),
        },
      });
      await tx.teacher.update({
        where: { userId: id },
        data: {
          status: status === "active" ? "active" : "inactive",
          ...(uploaded.path ? { profileImage: uploaded.path } : {}),
        },
      });
    });
  } catch {
    await deleteTeacherAvatar(uploaded.path);
    logError("admin.teacher_update_failed", { userId: id });
    return { ok: false, message: "Failed to update teacher.", values };
  }

  if (uploaded.path && oldImage && oldImage !== uploaded.path) {
    await deleteTeacherAvatar(oldImage);
  }

  logAudit("admin.teacher_updated", { userId: id });
  revalidatePath("/admin/teachers");
  revalidatePath(`/teacher`);

  return {
    ok: true,
    message:
      password !== null
        ? "Teacher and password updated successfully!"
        : "Teacher updated successfully!",
  };
}

export async function deleteTeacherAction(userId: number): Promise<ActionResult> {
  await requireRole("admin");

  if (!Number.isInteger(userId) || userId <= 0) {
    return { ok: false, message: "Invalid teacher." };
  }

  const target = await prisma.user.findFirst({
    where: { id: userId, role: "teacher" },
    select: { teacher: { select: { profileImage: true } } },
  });
  if (!target) {
    return { ok: false, message: "Teacher not found." };
  }

  try {
    // Cascades remove the teacher row, subjects and reactions.
    await prisma.user.delete({ where: { id: userId } });
  } catch {
    logError("admin.teacher_delete_failed", { userId });
    return { ok: false, message: "Failed to delete teacher." };
  }

  await deleteTeacherAvatar(target.teacher?.profileImage);
  logAudit("admin.teacher_deleted", { userId });
  revalidatePath("/admin/teachers");
  revalidatePath("/admin");

  return { ok: true, message: "Teacher deleted successfully!" };
}

export async function addSubjectAction(formData: FormData): Promise<TeacherFormState> {
  await requireRole("admin");

  const teacherId = Number.parseInt(text(formData.get("teacher_id")), 10);
  const subjectName = text(formData.get("subject_name"));
  const course = text(formData.get("course"));
  const yearLevel = Number.parseInt(text(formData.get("year_level")), 10);

  const values: TeacherFormValues = {
    subjectName,
    course,
    yearLevel: Number.isFinite(yearLevel) ? String(yearLevel) : "",
  };

  const teacher = await prisma.teacher.findUnique({
    where: { id: teacherId },
    select: { id: true },
  });
  if (!teacher) {
    return { ok: false, message: "Teacher not found.", values };
  }

  if (subjectName.length === 0) {
    return { ok: false, message: "Subject name is required.", values };
  }
  if (Array.from(subjectName).length > 100) {
    return { ok: false, message: "Subject name must be at most 100 characters.", values };
  }
  if (!(await isValidCourse(course))) {
    return { ok: false, message: "Please choose a valid course.", values };
  }
  if (!(yearLevel >= 1 && yearLevel <= 3)) {
    return { ok: false, message: "Please choose a valid year level.", values };
  }

  const duplicate = await prisma.subject.findFirst({
    where: {
      teacherId,
      course,
      yearLevel,
      status: "active",
      subjectName: { equals: subjectName, mode: "insensitive" },
    },
    select: { id: true },
  });
  if (duplicate) {
    return {
      ok: false,
      message: `This subject is already assigned to this teacher for ${course} (Yr ${yearLevel}).`,
      values,
    };
  }

  try {
    await prisma.subject.create({
      data: { subjectName, course, yearLevel, teacherId },
    });
  } catch {
    logError("admin.subject_create_failed", { teacherId });
    return { ok: false, message: "Failed to add subject. Subject already exists.", values };
  }

  logAudit("admin.subject_created", { teacherId });
  revalidatePath("/admin/teachers");

  return {
    ok: true,
    message: "Subject added successfully!",
    subjects: await listSubjects(teacherId),
  };
}

export async function removeSubjectAction(subjectId: number): Promise<TeacherFormState> {
  await requireRole("admin");

  if (!Number.isInteger(subjectId) || subjectId <= 0) {
    return { ok: false, message: "Invalid subject." };
  }

  const subject = await prisma.subject.findUnique({
    where: { id: subjectId },
    select: { teacherId: true },
  });
  if (!subject) {
    return { ok: false, message: "Subject not found." };
  }

  try {
    await prisma.subject.delete({ where: { id: subjectId } });
  } catch {
    logError("admin.subject_delete_failed", { subjectId });
    return { ok: false, message: "Failed to remove subject." };
  }

  logAudit("admin.subject_deleted", { subjectId, teacherId: subject.teacherId });
  revalidatePath("/admin/teachers");

  return {
    ok: true,
    message: "Subject removed successfully!",
    subjects: await listSubjects(subject.teacherId),
  };
}

async function listSubjects(teacherId: number): Promise<TeacherSubject[]> {
  const subjects = await prisma.subject.findMany({
    where: { teacherId },
    select: { id: true, subjectName: true, course: true, yearLevel: true },
    orderBy: [{ subjectName: "asc" }, { id: "asc" }],
  });

  return subjects.map((subject) => ({
    id: subject.id,
    label: `${subject.subjectName} - ${subject.course} (Yr ${subject.yearLevel})`,
  }));
}

async function isValidCourse(code: string): Promise<boolean> {
  if (!code) return false;
  const course = await prisma.course.findUnique({
    where: { courseCode: code },
    select: { id: true },
  });
  return course !== null;
}

async function stageAvatar(
  formData: FormData,
): Promise<{ ok: true; path: string | null } | { ok: false; error: string }> {
  const file = formData.get("profile_image");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: true, path: null };
  }

  const upload = await uploadTeacherAvatar(file);
  if (!upload.ok) {
    return { ok: false, error: upload.error };
  }

  return { ok: true, path: upload.path };
}

function text(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim() : "";
}

function isValidFullName(value: string): boolean {
  const length = Array.from(value.trim()).length;
  return length >= 2 && length <= 100;
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  );
}
