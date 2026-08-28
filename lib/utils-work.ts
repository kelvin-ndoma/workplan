import { subDays } from "date-fns";
import { isApproachingDeadline, isOverdue } from "@/lib/dates";
import type { TaskWarningKind } from "@/types";

type TaskLike = {
  dueDate?: string | Date | null;
  status?: string;
  updatedAt?: string | Date;
  dependencyIds?: string[];
};

export function getTaskWarnings(
  task: TaskLike,
  options?: { blockedDependencies?: boolean },
): TaskWarningKind[] {
  const warnings: TaskWarningKind[] = [];
  if (isOverdue(task.dueDate, task.status)) warnings.push("OVERDUE");
  else if (isApproachingDeadline(task.dueDate, task.status)) {
    warnings.push("APPROACHING_DEADLINE");
  }

  if (task.updatedAt) {
    const updated =
      typeof task.updatedAt === "string"
        ? new Date(task.updatedAt)
        : task.updatedAt;
    if (updated < subDays(new Date(), 7) && task.status !== "COMPLETED") {
      warnings.push("NO_RECENT_ACTIVITY");
    }
  }

  if (options?.blockedDependencies) warnings.push("BLOCKED_DEPENDENCY");
  return warnings;
}

export function parseMentions(body: string) {
  return Array.from(body.matchAll(/@([A-Za-z][A-Za-z0-9._-]*)/g)).map(
    (match) => match[1].toLowerCase(),
  );
}

export function splitLines(value?: string | null) {
  if (!value) return [];
  return value
    .split(/\r?\n|,/)
    .map((line) => line.replace(/^[-*•]\s*/, "").trim())
    .filter(Boolean);
}
