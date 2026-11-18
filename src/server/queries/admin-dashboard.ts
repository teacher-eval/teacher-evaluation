import type { RatingLabel } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";

/**
 * Headline counts and recent activity for the admin dashboard, from
 * getAdminDashboardData() in backend/controllers/AdminController.php.
 *
 * The legacy function cached the payload for five minutes; Next.js renders the
 * page dynamically, so the cache is dropped rather than reimplemented.
 */

export type RecentEvaluation = {
  date: Date;
  teacherName: string;
  subject: string;
  feels: RatingLabel;
  count: number;
};

export type AdminDashboardData = {
  totalTeachers: number;
  totalStudents: number;
  totalSubjects: number;
  totalEvaluations: number;
  recentEvaluations: RecentEvaluation[];
};

export async function getAdminDashboard(): Promise<AdminDashboardData> {
  const [totalTeachers, totalStudents, totalSubjects, totalEvaluations, groups] =
    await Promise.all([
      prisma.teacher.count(),
      prisma.user.count({ where: { role: "student" } }),
      prisma.subject.count({ where: { status: "active" } }),
      prisma.reaction.count(),
      // One row per day + teacher + subject + rating, newest day first.
      prisma.reaction.groupBy({
        by: ["date", "teacherId", "subject", "feels"],
        _count: { _all: true },
        orderBy: { date: "desc" },
        take: 10,
      }),
    ]);

  const teacherIds = [...new Set(groups.map((group) => group.teacherId))];
  const teachers =
    teacherIds.length > 0
      ? await prisma.teacher.findMany({
          where: { id: { in: teacherIds } },
          select: { id: true, user: { select: { fullName: true } } },
        })
      : [];
  const nameById = new Map(teachers.map((teacher) => [teacher.id, teacher.user.fullName]));

  return {
    totalTeachers,
    totalStudents,
    totalSubjects,
    totalEvaluations,
    recentEvaluations: groups.map((group) => ({
      date: group.date,
      teacherName: nameById.get(group.teacherId) ?? "Unknown teacher",
      subject: group.subject,
      feels: group.feels,
      count: group._count._all,
    })),
  };
}
