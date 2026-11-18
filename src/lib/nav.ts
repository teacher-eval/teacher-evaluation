import type { UserRole } from "@/generated/prisma/enums";

export type NavKey =
  | "dashboard"
  | "teachers"
  | "students"
  | "courses"
  | "reports"
  | "evaluation_form"
  | "evaluation_settings"
  | "account_settings";

export type NavItem = {
  key: NavKey;
  href: string;
  label: string;
};

const ADMIN_NAV: NavItem[] = [
  { key: "dashboard", href: "/admin", label: "Dashboard" },
  { key: "teachers", href: "/admin/teachers", label: "Teachers" },
  { key: "students", href: "/admin/students", label: "Students" },
  { key: "courses", href: "/admin/courses", label: "Courses" },
  { key: "reports", href: "/admin/reports", label: "Reports" },
  { key: "evaluation_form", href: "/admin/evaluation-form", label: "Evaluation Form" },
  {
    key: "evaluation_settings",
    href: "/admin/evaluation-settings",
    label: "Evaluation Settings",
  },
  { key: "account_settings", href: "/admin/account", label: "Account Settings" },
];

const TEACHER_NAV: NavItem[] = [
  { key: "dashboard", href: "/teacher", label: "Dashboard" },
  { key: "account_settings", href: "/teacher/account", label: "Account Settings" },
];

const STUDENT_NAV: NavItem[] = [
  { key: "dashboard", href: "/student", label: "Dashboard" },
  { key: "account_settings", href: "/student/account", label: "Account Settings" },
];

export function navForRole(role: UserRole): NavItem[] {
  switch (role) {
    case "admin":
      return ADMIN_NAV;
    case "teacher":
      return TEACHER_NAV;
    default:
      return STUDENT_NAV;
  }
}

export function homeForRole(role: UserRole): string {
  switch (role) {
    case "admin":
      return "/admin";
    case "teacher":
      return "/teacher";
    default:
      return "/student";
  }
}

export function roleLabel(role: UserRole): string {
  switch (role) {
    case "admin":
      return "Administrator";
    case "teacher":
      return "Instructor";
    default:
      return "Student";
  }
}
