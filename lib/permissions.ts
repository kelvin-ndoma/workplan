import type { Role, SessionUser } from "@/types";

export function hasRole(user: Pick<SessionUser, "role">, roles: Role[]) {
  return roles.includes(user.role);
}

export function isLeadership(user: Pick<SessionUser, "role">) {
  return user.role === "ADMIN" || user.role === "MANAGER";
}

export function canManageUsers(user: Pick<SessionUser, "role">) {
  return user.role === "ADMIN";
}

export function canManageMeetings(user: Pick<SessionUser, "role">) {
  return isLeadership(user);
}

export function canCreateProjects(user: Pick<SessionUser, "role">) {
  return isLeadership(user);
}

export function canAssignWork(user: Pick<SessionUser, "role">) {
  return isLeadership(user);
}

export function canViewAllWork(user: Pick<SessionUser, "role">) {
  return isLeadership(user);
}

export function canUpdateTask(
  user: SessionUser,
  task: { assignedTo?: string | null; createdBy?: string | null },
) {
  if (isLeadership(user)) return true;
  return task.assignedTo === user.id || task.createdBy === user.id;
}

export function canShareScreen(_user: Pick<SessionUser, "role" | "id">) {
  return Boolean(_user.id);
}

export function homePathForRole(role: Role) {
  if (role === "ADMIN") return "/leadership";
  if (role === "MANAGER") return "/team";
  return "/my-work";
}
