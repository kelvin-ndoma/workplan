import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { connectDB } from "@/lib/db";
import { homePathForRole } from "@/lib/permissions";
import { User } from "@/models/User";
import type { Role, SessionUser } from "@/types";

export async function getSessionUser(): Promise<SessionUser | null> {
  try {
    const session = await auth();
    if (!session?.user?.id) return null;
    try {
      await connectDB();
      const live = await User.findById(session.user.id)
        .select("name email role avatar jobTitle departmentId managerId isActive invitePending credentialsVersion")
        .lean();
      if (!live || live.isActive === false) return null;
      if (live.invitePending) return null;
      if (Number(live.credentialsVersion ?? 0) !== Number(session.user.credentialsVersion ?? 0)) {
        return null;
      }
      return {
        id: session.user.id,
        name: String(live.name ?? session.user.name ?? ""),
        email: String(live.email ?? session.user.email ?? ""),
        role: live.role as Role,
        avatar: live.avatar || undefined,
        jobTitle: live.jobTitle || undefined,
        departmentId: live.departmentId ? String(live.departmentId) : undefined,
        managerId: live.managerId ? String(live.managerId) : undefined,
      };
    } catch {
      return null;
    }
  } catch {
    return null;
  }
}

export async function requireUser() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireRole(roles: Role[]) {
  const user = await requireUser();
  if (!roles.includes(user.role)) {
    redirect(homePathForRole(user.role));
  }
  return user;
}
