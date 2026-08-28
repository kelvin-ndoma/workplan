import {
  addDays,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  isBefore,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";

export function currentWorkPlanMonth(date = new Date()) {
  return format(date, "yyyy-MM");
}

export function formatMonthLabel(month: string) {
  const [year, m] = month.split("-").map(Number);
  return format(new Date(year, m - 1, 1), "MMMM yyyy");
}

export function shiftMonth(month: string, delta: number) {
  const [year, m] = month.split("-").map(Number);
  const date = new Date(year, m - 1 + delta, 1);
  return format(date, "yyyy-MM");
}

export function monthBounds(month: string) {
  const [year, m] = month.split("-").map(Number);
  const start = startOfMonth(new Date(year, m - 1, 1));
  const end = endOfMonth(start);
  return { start, end };
}

export function isOverdue(dueDate?: string | Date | null, status?: string) {
  if (!dueDate) return false;
  if (status === "COMPLETED" || status === "CANCELLED") return false;
  const due = typeof dueDate === "string" ? parseISO(dueDate) : dueDate;
  return isBefore(endOfDay(due), startOfDay(new Date()));
}

export function isApproachingDeadline(
  dueDate?: string | Date | null,
  status?: string,
  days = 3,
) {
  if (!dueDate) return false;
  if (status === "COMPLETED" || status === "CANCELLED") return false;
  const due = typeof dueDate === "string" ? parseISO(dueDate) : dueDate;
  const soon = addDays(startOfDay(new Date()), days);
  return !isOverdue(due, status) && isBefore(startOfDay(due), addDays(soon, 1));
}

export function todayBounds() {
  const now = new Date();
  return { start: startOfDay(now), end: endOfDay(now) };
}

export function weekBounds() {
  const now = new Date();
  return {
    start: startOfWeek(now, { weekStartsOn: 1 }),
    end: endOfWeek(now, { weekStartsOn: 1 }),
  };
}

export function formatShortDate(date?: string | Date | null) {
  if (!date) return "—";
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "MMM d, yyyy");
}

export function formatDateTime(date?: string | Date | null) {
  if (!date) return "—";
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "MMM d, yyyy h:mm a");
}
