import { connectDB } from "@/lib/db";
import { AuditLog } from "@/models/AuditLog";
import { Notification } from "@/models/Notification";
import { Activity } from "@/models/Activity";
import type { ActivityType, TaskStatus } from "@/types";

export async function writeAudit(input: {
  actorId: string;
  action: string;
  entityType: string;
  entityId?: string;
  details?: Record<string, unknown>;
}) {
  await connectDB();
  await AuditLog.create({
    actorId: input.actorId,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId ?? "",
    details: input.details ?? {},
  });
}

export async function notify(input: {
  userId: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  metadata?: Record<string, unknown>;
}) {
  if (!input.userId) return;
  await connectDB();
  await Notification.create({
    userId: input.userId,
    type: input.type,
    title: input.title,
    message: input.message,
    link: input.link ?? "",
    metadata: input.metadata ?? {},
  });
}

export async function recordActivity(input: {
  taskId: string;
  userId: string;
  type: ActivityType;
  message: string;
  previousProgress?: number;
  newProgress?: number;
  previousStatus?: TaskStatus;
  newStatus?: TaskStatus;
  metadata?: Record<string, unknown>;
}) {
  await connectDB();
  return Activity.create({
    taskId: input.taskId,
    userId: input.userId,
    type: input.type,
    message: input.message,
    previousProgress: input.previousProgress,
    newProgress: input.newProgress,
    previousStatus: input.previousStatus,
    newStatus: input.newStatus,
    metadata: input.metadata ?? {},
  });
}
