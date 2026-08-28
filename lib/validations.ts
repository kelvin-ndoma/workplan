import { z } from "zod";
import { PRIORITIES, PROJECT_STATUSES, ROLES, TASK_STATUSES } from "@/types";

import { isAllowedWorkEmail } from "@/lib/allowed-email";

export const loginSchema = z.object({
  email: z.string().email().refine(isAllowedWorkEmail, { message: "Use your Burns Brothers email." }),
  password: z.string().min(1),
});

export const userSchema = z.object({
  name: z.string().min(2),
  email: z.string().email().refine(isAllowedWorkEmail, { message: "Use a Burns Brothers email." }),
  password: z
    .string()
    .optional()
    .transform((value) => (value && value.trim().length ? value : undefined))
    .pipe(z.string().min(8).optional()),
  role: z.enum(ROLES),
  jobTitle: z.string().optional(),
  departmentId: z.string().optional(),
  managerId: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const departmentSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  managerId: z.string().optional(),
  memberIds: z.array(z.string()).optional(),
});

export const projectSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  ownerId: z.string().min(1),
  memberIds: z.array(z.string()).optional(),
  departmentId: z.string().optional(),
  status: z.enum(PROJECT_STATUSES).optional(),
  priority: z.enum(PRIORITIES).optional(),
  startDate: z.string().optional(),
  targetDate: z.string().optional(),
  color: z.string().optional(),
});

export const deliverableSchema = z.object({
  projectId: z.string().min(1),
  name: z.string().min(2),
  description: z.string().optional(),
  ownerId: z.string().min(1),
  status: z.enum(PROJECT_STATUSES).optional(),
  priority: z.enum(PRIORITIES).optional(),
  startDate: z.string().optional(),
  dueDate: z.string().optional(),
});

export const taskSchema = z.object({
  title: z.string().min(2),
  description: z.string().optional(),
  projectId: z.string().min(1),
  deliverableId: z.string().min(1),
  assignedTo: z.string().optional(),
  status: z.enum(TASK_STATUSES).optional(),
  priority: z.enum(PRIORITIES).optional(),
  progress: z.number().min(0).max(100).optional(),
  weight: z.number().min(1).optional(),
  startDate: z.string().optional(),
  dueDate: z.string().optional(),
  actionsTaken: z.array(z.string()).optional(),
  nextAction: z.string().optional(),
  nextActions: z.array(z.string()).optional(),
  supportNeeded: z.boolean().optional(),
  supportDescription: z.string().optional(),
  blocker: z.string().optional(),
  tags: z.array(z.string()).optional(),
  workPlanMonth: z.string().regex(/^\d{4}-\d{2}$/),
  talkingPoints: z.array(z.string()).optional(),
});

export const quickUpdateSchema = z.object({
  taskId: z.string().min(1),
  progress: z.number().min(0).max(100),
  status: z.enum(TASK_STATUSES),
  accomplished: z.string().optional(),
  nextAction: z.string().optional(),
  supportNeeded: z.boolean().optional(),
  supportDetails: z.string().optional(),
  blocker: z.string().optional(),
});

export const statusUpdateSchema = z.object({
  taskId: z.string().min(1),
  progress: z.number().min(0).max(100),
  status: z.enum(TASK_STATUSES),
  actionsTaken: z.string().optional(),
  nextActions: z.string().optional(),
  support: z.string().optional(),
  meetingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const commentSchema = z.object({
  targetType: z.enum(["TASK", "PROJECT", "MEETING"]),
  targetId: z.string().min(1),
  body: z.string().min(1).max(4000),
});

export const meetingSchema = z.object({
  title: z.string().min(2),
  date: z.string().min(1),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  participantIds: z.array(z.string()).optional(),
  departmentIds: z.array(z.string()).optional(),
  projectIds: z.array(z.string()).optional(),
  agenda: z.array(z.string()).optional(),
  notes: z.string().optional(),
  workPlanMonth: z.string().regex(/^\d{4}-\d{2}$/),
});

export const decisionSchema = z.object({
  meetingId: z.string().min(1),
  title: z.string().min(2),
  description: z.string().optional(),
  decision: z.string().min(2),
  ownerId: z.string().optional(),
});

export const actionItemSchema = z.object({
  meetingId: z.string().min(1),
  title: z.string().min(2),
  ownerId: z.string().min(1),
  projectId: z.string().min(1),
  deliverableId: z.string().optional(),
  dueDate: z.string().optional(),
  priority: z.enum(PRIORITIES).optional(),
});
