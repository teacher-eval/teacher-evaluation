import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthFooter, AuthHeader } from "@/components/auth/auth-shell";
import { RegisterForm } from "@/components/auth/register-form";
import { prisma } from "@/lib/db";
import { homeForRole } from "@/lib/nav";
import { currentUser } from "@/lib/rbac";

export const metadata: Metadata = { title: "Student Registration" };

export default async function RegisterPage() {
  const user = await currentUser();
  if (user) redirect(homeForRole(user.role));

  let courses: Array<{ courseCode: string; courseName: string }> = [];
  try {
    courses = await prisma.course.findMany({
      orderBy: { courseCode: "asc" },
      select: { courseCode: true, courseName: true },
    });
  } catch {
    courses = [];
  }

  return (
    <div className="mx-auto w-full max-w-[440px] py-6">
      <div className="auth-card">
        <AuthHeader
          title="Student Registration"
          subtitle="Create your student account"
          note="ASCB • TVET Department"
        />
        <RegisterForm courses={courses} />
        <AuthFooter />
      </div>
    </div>
  );
}
