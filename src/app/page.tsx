import { redirect } from "next/navigation";

import { homeForRole } from "@/lib/nav";
import { currentUser } from "@/lib/rbac";

export default async function Home() {
  const user = await currentUser();
  redirect(user ? homeForRole(user.role) : "/login");
}
