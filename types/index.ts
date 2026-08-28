export const ROLES = ["ADMIN", "MANAGER", "TEAM_MEMBER"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Admin",
  MANAGER: "Manager",
  TEAM_MEMBER: "Team member",
};

export const PROJECT_STATUSES = [
  "PLANNING",
  "ACTIVE",
  "AT_RISK",
  "ON_HOLD",
  "COMPLETED",
  "ARCHIVED",
] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const TASK_STATUSES = [
  "NOT_STARTED",
  "IN_PROGRESS",
  "AT_RISK",
  "BLOCKED",
  "COMPLETED",
  "CANCELLED",
] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const ACTIVITY_TYPES = [
  "PROGRESS_UPDATE",
  "STATUS_CHANGE",
  "COMMENT",
  "ACTION_COMPLETED",
  "NEXT_ACTION",
  "BLOCKER_ADDED",
  "BLOCKER_REMOVED",
  "SUPPORT_REQUESTED",
  "ASSIGNMENT_CHANGED",
  "DEADLINE_CHANGED",
] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export const SUPPORT_STATUSES = ["OPEN", "IN_PROGRESS", "RESOLVED"] as const;
export type SupportStatus = (typeof SUPPORT_STATUSES)[number];

export const MEETING_STATUSES = [
  "SCHEDULED",
  "LIVE",
  "COMPLETED",
  "CANCELLED",
] as const;
export type MeetingStatus = (typeof MEETING_STATUSES)[number];

export const COMMENT_TARGETS = ["TASK", "PROJECT", "MEETING"] as const;
export type CommentTarget = (typeof COMMENT_TARGETS)[number];

export const SLIDE_TYPES = [
  "overview",
  "member-overview",
  "member-brief",
  "member-completed",
  "member-progress",
  "member-next",
  "member-support",
  "decisions",
  "action-items",
  "summary",
] as const;
export type SlideType = (typeof SLIDE_TYPES)[number];

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar?: string;
  jobTitle?: string;
  departmentId?: string;
  managerId?: string;
};

export type TaskWarningKind =
  | "OVERDUE"
  | "APPROACHING_DEADLINE"
  | "NO_RECENT_ACTIVITY"
  | "BLOCKED_DEPENDENCY";

export type PresentationMode = "host" | "audience" | "presenter";
