"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import { requireRole, requireUser } from "@/lib/session";
import { canAssignWork, canCreateProjects, canUpdateTask, isLeadership } from "@/lib/permissions";
import { notify, recordActivity, writeAudit } from "@/lib/services/events";
import { recalculateProgress } from "@/lib/services/progress";
import { parseMentions, splitLines } from "@/lib/utils-work";
import {
  actionItemSchema,
  commentSchema,
  decisionSchema,
  deliverableSchema,
  meetingSchema,
  projectSchema,
  quickUpdateSchema,
  statusUpdateSchema,
  taskSchema,
  userSchema,
  departmentSchema,
} from "@/lib/validations";
import {
  Comment,
  Decision,
  Deliverable,
  Department,
  Meeting,
  Notification,
  Project,
  SupportRequest,
  Task,
  User,
} from "@/models";
import { randomBytes } from "crypto";
import { currentWorkPlanMonth } from "@/lib/dates";
import { sendAssignmentEmail } from "@/lib/services/reminders";
import { saveMeetingStatus } from "@/lib/meeting-status";
import { nextMeetingDateKey, resolveMeetingDateKey } from "@/lib/meetings/cadence";
import { isEmailConfigured } from "@/lib/email";
import { sendAccountInvite } from "@/lib/invite";
import type { TaskStatus } from "@/types";

function revalidateWork() {
  revalidatePath("/my-work");
  revalidatePath("/team");
  revalidatePath("/leadership");
  revalidatePath("/projects");
  revalidatePath("/calendar");
  revalidatePath("/meetings");
  revalidatePath("/reports");
  revalidatePath("/brief");
}

export async function createUserAction(input: unknown) {
  const actor = await requireRole(["ADMIN"]);
  const data = userSchema.parse(input);
  await connectDB();
  const existing = await User.findOne({ email: data.email.toLowerCase() });
  if (existing) return { error: "Email already in use." };
  const providedPassword = data.password?.trim();
  const passwordHash = await bcrypt.hash(
    providedPassword || (isEmailConfigured() ? randomBytes(24).toString("hex") : "WorkPlan2026!"),
    10,
  );
  const user = await User.create({
    ...data,
    email: data.email.toLowerCase(),
    passwordHash,
    isActive: data.isActive ?? true,
  });
  if (!providedPassword && isEmailConfigured()) {
    const invite = await sendAccountInvite(String(user._id));
    if (invite && "error" in invite && invite.error) {
      revalidatePath("/admin");
      return { id: String(user._id), invited: false, error: invite.error };
    }
  }
  await writeAudit({
    actorId: actor.id,
    action: "USER_CREATED",
    entityType: "User",
    entityId: String(user._id),
    details: { email: user.email, role: user.role },
  });
  revalidatePath("/admin");
  return { id: String(user._id), invited: Boolean(!providedPassword && isEmailConfigured()) };
}

export async function inviteUserAction(userId: string) {
  const actor = await requireRole(["ADMIN"]);
  const result = await sendAccountInvite(userId);
  if (result && "error" in result && result.error) return result;
  await writeAudit({
    actorId: actor.id,
    action: "USER_INVITED",
    entityType: "User",
    entityId: userId,
    details: { email: result.email },
  });
  revalidatePath("/admin");
  return { ok: true as const, email: result.email };
}

export async function inviteTeamAction() {
  const actor = await requireRole(["ADMIN"]);
  await connectDB();
  const people = await User.find({ isActive: true, _id: { $ne: actor.id } }).select("name email").lean();
  let sent = 0;
  let failed = 0;
  for (const person of people) {
    const result = await sendAccountInvite(String(person._id));
    if (result && "ok" in result && result.ok) {
      sent += 1;
      await writeAudit({
        actorId: actor.id,
        action: "USER_INVITED",
        entityType: "User",
        entityId: String(person._id),
        details: { email: person.email },
      });
    } else {
      failed += 1;
    }
  }
  revalidatePath("/admin");
  if (sent === 0) {
    return { error: failed ? "Could not send invites. Check email setup and try again." : "No one else to invite." };
  }
  return { ok: true as const, sent, failed };
}

export async function updateUserAction(id: string, input: unknown) {
  const actor = await requireRole(["ADMIN"]);
  const data = userSchema.partial().parse(input);
  await connectDB();
  const current = await User.findById(id);
  if (!current) return { error: "User not found." };

  if (data.role && data.role !== current.role && current.role === "ADMIN") {
    const adminCount = await User.countDocuments({ role: "ADMIN", isActive: true });
    if (adminCount <= 1) return { error: "Keep at least one admin." };
  }

  const updates: Record<string, unknown> = { ...data };
  if (data.password) {
    updates.passwordHash = await bcrypt.hash(data.password, 10);
  }
  delete updates.password;
  if (data.managerId === "") updates.managerId = null;

  const user = await User.findByIdAndUpdate(id, updates, { new: true });
  if (data.role && data.role !== current.role) {
    await writeAudit({
      actorId: actor.id,
      action: "USER_ROLE_CHANGED",
      entityType: "User",
      entityId: id,
      details: { email: current.email, from: current.role, to: data.role },
    });
    await notify({
      userId: id,
      type: "ROLE_CHANGED",
      title: "Your role was updated",
      message: `Your WorkPlan role is now ${String(data.role).replaceAll("_", " ").toLowerCase()}.`,
      link: "/",
    });
  }
  if (data.isActive === false) {
    await writeAudit({
      actorId: actor.id,
      action: "USER_DISABLED",
      entityType: "User",
      entityId: id,
    });
  }
  revalidatePath("/admin");
  revalidatePath("/settings");
  revalidatePath("/", "layout");
  return { ok: Boolean(user) };
}

export async function createDepartmentAction(input: unknown) {
  await requireRole(["ADMIN"]);
  const data = departmentSchema.parse(input);
  await connectDB();
  const department = await Department.create(data);
  revalidatePath("/admin");
  return { id: String(department._id) };
}

export async function createProjectAction(input: unknown) {
  const user = await requireUser();
  if (!canCreateProjects(user)) return { error: "Not permitted." };
  const data = projectSchema.parse(input);
  await connectDB();
  const project = await Project.create({
    ...data,
    startDate: data.startDate ? new Date(data.startDate) : undefined,
    targetDate: data.targetDate ? new Date(data.targetDate) : undefined,
  });
  await writeAudit({
    actorId: user.id,
    action: "PROJECT_CREATED",
    entityType: "Project",
    entityId: String(project._id),
    details: { name: project.name },
  });
  revalidateWork();
  return { id: String(project._id) };
}

export async function createDeliverableAction(input: unknown) {
  const user = await requireUser();
  if (!canCreateProjects(user)) return { error: "Not permitted." };
  const data = deliverableSchema.parse(input);
  await connectDB();
  const deliverable = await Deliverable.create({
    ...data,
    startDate: data.startDate ? new Date(data.startDate) : undefined,
    dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
  });
  revalidateWork();
  return { id: String(deliverable._id) };
}

export async function createTaskAction(input: unknown) {
  const user = await requireUser();
  if (!canAssignWork(user) && !input) return { error: "Not permitted." };
  const parsed = taskSchema.parse({
    ...(input as object),
    workPlanMonth:
      (input as { workPlanMonth?: string }).workPlanMonth || currentWorkPlanMonth(),
  });
  if (!canAssignWork(user) && parsed.assignedTo && parsed.assignedTo !== user.id) {
    return { error: "Not permitted to assign this task." };
  }
  await connectDB();
  const task = await Task.create({
    ...parsed,
    createdBy: user.id,
    startDate: parsed.startDate ? new Date(parsed.startDate) : undefined,
    dueDate: parsed.dueDate ? new Date(parsed.dueDate) : undefined,
    completedAt: parsed.status === "COMPLETED" ? new Date() : undefined,
  });
  await recordActivity({
    taskId: String(task._id),
    userId: user.id,
    type: "ASSIGNMENT_CHANGED",
    message: `Task created: ${task.title}`,
  });
  await writeAudit({
    actorId: user.id,
    action: "TASK_CREATED",
    entityType: "Task",
    entityId: String(task._id),
    details: { title: task.title, assignedTo: parsed.assignedTo },
  });
  if (parsed.assignedTo && parsed.assignedTo !== user.id) {
    await notify({
      userId: parsed.assignedTo,
      type: "TASK_ASSIGNED",
      title: "Work assigned",
      message: `${user.name} assigned you “${task.title}”.`,
      link: `/tasks/${String(task._id)}`,
    });
    await sendAssignmentEmail({
      assigneeId: parsed.assignedTo,
      assignerName: user.name,
      title: task.title,
      month: parsed.workPlanMonth,
      taskId: String(task._id),
    });
  }
  if (parsed.supportNeeded && parsed.supportDescription) {
    await SupportRequest.create({
      taskId: task._id,
      requestedBy: user.id,
      description: parsed.supportDescription,
      status: "OPEN",
    });
  }
  await recalculateProgress({
    deliverableId: parsed.deliverableId,
    projectId: parsed.projectId,
  });
  revalidateWork();
  return { id: String(task._id) };
}

export async function quickUpdateAction(input: unknown) {
  const user = await requireUser();
  const data = quickUpdateSchema.parse(input);
  await connectDB();
  const task = await Task.findById(data.taskId);
  if (!task) return { error: "Task not found." };
  if (!canUpdateTask(user, { assignedTo: String(task.assignedTo ?? ""), createdBy: String(task.createdBy) })) {
    return { error: "Not permitted." };
  }

  const previousProgress = task.progress;
  const previousStatus = task.status as TaskStatus;
  const accomplished = data.accomplished?.trim();
  const nextAction = data.nextAction?.trim();

  if (accomplished) {
    const lines = splitLines(accomplished);
    task.actionsTaken = [...(task.actionsTaken ?? []), ...lines];
  }
  if (nextAction) {
    task.nextAction = nextAction;
    const extras = splitLines(nextAction);
    task.nextActions = extras.length > 1 ? extras : [nextAction];
  }
  task.progress = data.progress;
  task.status = data.status;
  if (data.status === "COMPLETED" && previousStatus !== "COMPLETED") {
    task.completedAt = new Date();
  }
  if (data.supportNeeded) {
    task.supportNeeded = true;
    task.supportDescription = data.supportDetails || task.supportDescription;
  }
  if (data.blocker !== undefined) {
    task.blocker = data.blocker;
    if (data.blocker) task.status = task.status === "COMPLETED" ? task.status : "BLOCKED";
  }

  await task.save();

  if (accomplished) {
    await recordActivity({
      taskId: String(task._id),
      userId: user.id,
      type: "ACTION_COMPLETED",
      message: accomplished,
      previousProgress,
      newProgress: data.progress,
      previousStatus,
      newStatus: data.status,
    });
  }
  if (previousProgress !== data.progress) {
    await recordActivity({
      taskId: String(task._id),
      userId: user.id,
      type: "PROGRESS_UPDATE",
      message: accomplished || `Progress updated to ${data.progress}%.`,
      previousProgress,
      newProgress: data.progress,
      previousStatus,
      newStatus: data.status,
    });
    await writeAudit({
      actorId: user.id,
      action: "PROGRESS_CHANGED",
      entityType: "Task",
      entityId: String(task._id),
      details: { previousProgress, newProgress: data.progress },
    });
  }
  if (previousStatus !== data.status) {
    await recordActivity({
      taskId: String(task._id),
      userId: user.id,
      type: "STATUS_CHANGE",
      message: `Status changed from ${previousStatus} to ${data.status}.`,
      previousStatus,
      newStatus: data.status,
    });
    await writeAudit({
      actorId: user.id,
      action: "STATUS_CHANGED",
      entityType: "Task",
      entityId: String(task._id),
      details: { previousStatus, newStatus: data.status },
    });
  }
  if (nextAction) {
    await recordActivity({
      taskId: String(task._id),
      userId: user.id,
      type: "NEXT_ACTION",
      message: nextAction,
    });
  }
  if (data.supportNeeded && data.supportDetails) {
    await SupportRequest.create({
      taskId: task._id,
      requestedBy: user.id,
      description: data.supportDetails,
      status: "OPEN",
    });
    await recordActivity({
      taskId: String(task._id),
      userId: user.id,
      type: "SUPPORT_REQUESTED",
      message: data.supportDetails,
    });
    const managers = await User.find({ role: { $in: ["ADMIN", "MANAGER"] }, isActive: true });
    await Promise.all(
      managers.map((manager) =>
        notify({
          userId: String(manager._id),
          type: "SUPPORT_REQUESTED",
          title: "Support requested",
          message: `${user.name}: ${data.supportDetails}`,
          link: `/tasks/${String(task._id)}`,
        }),
      ),
    );
  }
  if (data.blocker) {
    await recordActivity({
      taskId: String(task._id),
      userId: user.id,
      type: "BLOCKER_ADDED",
      message: data.blocker,
    });
    const managers = await User.find({ role: { $in: ["ADMIN", "MANAGER"] }, isActive: true });
    await Promise.all(
      managers.map((manager) =>
        notify({
          userId: String(manager._id),
          type: "BLOCKER_CREATED",
          title: "Blocker added",
          message: `${user.name}: ${data.blocker}`,
          link: `/tasks/${String(task._id)}`,
        }),
      ),
    );
  }

  await recalculateProgress({
    deliverableId: String(task.deliverableId),
    projectId: String(task.projectId),
  });
  revalidateWork();
  revalidatePath(`/tasks/${String(task._id)}`);
  revalidatePath(`/meetings`);
  return { ok: true };
}

export async function statusUpdateAction(input: unknown) {
  const user = await requireUser();
  const data = statusUpdateSchema.parse(input);
  await connectDB();
  const task = await Task.findById(data.taskId);
  if (!task) return { error: "Not found." };
  if (!canUpdateTask(user, { assignedTo: String(task.assignedTo ?? ""), createdBy: String(task.createdBy) })) {
    return { error: "Not permitted." };
  }

  const previousProgress = task.progress;
  const previousStatus = task.status as TaskStatus;
  const actionsTaken = splitLines(data.actionsTaken);
  const nextActions = splitLines(data.nextActions);
  const support = data.support?.trim() ?? "";
  const meetingDate = resolveMeetingDateKey(data.meetingDate);
  const working = nextMeetingDateKey();
  if (meetingDate < working) {
    return { error: "Past calls can’t be edited." };
  }
  const updateLive = meetingDate === working;

  await saveMeetingStatus({
    taskId: String(task._id),
    meetingDate,
    fields: {
      actionsTaken,
      nextActions,
      supportDescription: support,
      status: data.status,
      progress: data.progress,
    },
    updatedBy: user.id,
    liveTask: {
      actionsTaken: (task.actionsTaken ?? []).map(String),
      nextActions: (task.nextActions ?? []).map(String),
      nextAction: String(task.nextAction ?? ""),
      supportDescription: String(task.supportDescription ?? ""),
      blocker: String(task.blocker ?? ""),
      status: String(task.status),
      progress: Number(task.progress ?? 0),
    },
    updateLive,
  });

  if (updateLive) {
    task.actionsTaken = actionsTaken;
    task.nextActions = nextActions;
    task.nextAction = nextActions[0] ?? "";
    task.supportDescription = support;
    task.supportNeeded = Boolean(support) && !/^n\/a$/i.test(support);
    if (task.supportNeeded && /block|waiting|await/i.test(support) && data.status !== "COMPLETED") {
      task.blocker = support;
    } else if (!task.supportNeeded) {
      task.blocker = "";
    }
    task.progress = data.progress;
    task.status = data.status;
    if (data.status === "COMPLETED" && previousStatus !== "COMPLETED") {
      task.completedAt = new Date();
    }
    await task.save();
    await recalculateProgress({
      deliverableId: String(task.deliverableId),
      projectId: String(task.projectId),
    });
  }

  await recordActivity({
    taskId: String(task._id),
    userId: user.id,
    type: "PROGRESS_UPDATE",
    message: `Status updated for ${meetingDate}: ${data.status.replaceAll("_", " ")} at ${data.progress}%.`,
    previousProgress,
    newProgress: data.progress,
    previousStatus,
    newStatus: data.status,
  });
  revalidateWork();
  revalidatePath(`/tasks/${String(task._id)}`);
  return { ok: true };
}

export async function updateTaskStatusAction(taskId: string, status: TaskStatus) {
  return quickUpdateAction({
    taskId,
    status,
    progress:
      status === "COMPLETED"
        ? 100
        : status === "NOT_STARTED"
          ? 0
          : undefined,
  }).catch(async () => {
    const user = await requireUser();
    await connectDB();
    const task = await Task.findById(taskId);
    if (!task) return { error: "Task not found." };
    if (!canUpdateTask(user, { assignedTo: String(task.assignedTo ?? ""), createdBy: String(task.createdBy) })) {
      return { error: "Not permitted." };
    }
    const previousStatus = task.status as TaskStatus;
    const previousProgress = task.progress;
    task.status = status;
    if (status === "COMPLETED") {
      task.progress = 100;
      task.completedAt = new Date();
    }
    await task.save();
    await recordActivity({
      taskId,
      userId: user.id,
      type: "STATUS_CHANGE",
      message: `Status changed from ${previousStatus} to ${status}.`,
      previousStatus,
      newStatus: status,
      previousProgress,
      newProgress: task.progress,
    });
    await recalculateProgress({
      deliverableId: String(task.deliverableId),
      projectId: String(task.projectId),
    });
    revalidateWork();
    return { ok: true };
  });
}

export async function setTaskStatusAction(taskId: string, status: TaskStatus) {
  const user = await requireUser();
  await connectDB();
  const task = await Task.findById(taskId);
  if (!task) return { error: "Task not found." };
  if (!canUpdateTask(user, { assignedTo: String(task.assignedTo ?? ""), createdBy: String(task.createdBy) })) {
    return { error: "Not permitted." };
  }
  const previousStatus = task.status as TaskStatus;
  const previousProgress = task.progress;
  task.status = status;
  if (status === "COMPLETED") {
    task.progress = 100;
    task.completedAt = new Date();
  }
  await task.save();
  await recordActivity({
    taskId,
    userId: user.id,
    type: "STATUS_CHANGE",
    message: `Status changed from ${previousStatus} to ${status}.`,
    previousStatus,
    newStatus: status,
    previousProgress,
    newProgress: task.progress,
  });
  await writeAudit({
    actorId: user.id,
    action: "STATUS_CHANGED",
    entityType: "Task",
    entityId: taskId,
    details: { previousStatus, newStatus: status },
  });
  await recalculateProgress({
    deliverableId: String(task.deliverableId),
    projectId: String(task.projectId),
  });
  revalidateWork();
  return { ok: true };
}

export async function addCommentAction(input: unknown) {
  const user = await requireUser();
  const data = commentSchema.parse(input);
  await connectDB();
  const handles = parseMentions(data.body);
  const mentioned = handles.length
    ? await User.find({
        isActive: true,
        $or: handles.map((handle) => ({ name: new RegExp(`^${handle}`, "i") })),
      })
    : [];
  const comment = await Comment.create({
    ...data,
    userId: user.id,
    mentions: mentioned.map((item) => item._id),
  });
  if (data.targetType === "TASK") {
    await recordActivity({
      taskId: data.targetId,
      userId: user.id,
      type: "COMMENT",
      message: data.body,
    });
    const task = await Task.findById(data.targetId);
    if (task?.assignedTo && String(task.assignedTo) !== user.id) {
      await notify({
        userId: String(task.assignedTo),
        type: "COMMENT_ADDED",
        title: `${user.name} commented`,
        message: data.body.slice(0, 180),
        link: `/tasks/${data.targetId}`,
      });
    }
  }
  for (const person of mentioned) {
    if (String(person._id) === user.id) continue;
    await notify({
      userId: String(person._id),
      type: "USER_MENTIONED",
      title: `${user.name} mentioned you`,
      message: data.body.slice(0, 180),
      link:
        data.targetType === "TASK"
          ? `/tasks/${data.targetId}`
          : data.targetType === "PROJECT"
            ? `/projects/${data.targetId}`
            : `/meetings/${data.targetId}`,
    });
  }
  revalidateWork();
  return { id: String(comment._id) };
}

export async function resolveSupportAction(id: string, resolution: string, meetingId?: string) {
  const user = await requireUser();
  if (!isLeadership(user)) return { error: "Not permitted." };
  await connectDB();
  const support = await SupportRequest.findById(id);
  if (!support) return { error: "Not found." };
  support.status = "RESOLVED";
  support.resolution = resolution;
  support.resolvedAt = new Date();
  if (meetingId) support.meetingId = meetingId;
  await support.save();
  const task = await Task.findById(support.taskId);
  if (task) {
    task.supportNeeded = false;
    if (!task.blocker) {
      // keep blocker if still present
    }
    await task.save();
    await recordActivity({
      taskId: String(task._id),
      userId: user.id,
      type: "SUPPORT_REQUESTED",
      message: meetingId
        ? `Resolved during meeting: ${resolution}`
        : `Support resolved: ${resolution}`,
    });
  }
  if (support.requestedBy) {
    await notify({
      userId: String(support.requestedBy),
      type: "SUPPORT_REQUESTED",
      title: "Support request resolved",
      message: resolution,
      link: `/tasks/${String(support.taskId)}`,
    });
  }
  revalidateWork();
  return { ok: true };
}

export async function resolveBlockerAction(taskId: string, resolution: string, meetingId?: string) {
  const user = await requireUser();
  if (!isLeadership(user)) return { error: "Not permitted." };
  await connectDB();
  const task = await Task.findById(taskId);
  if (!task) return { error: "Not found." };
  const previous = task.blocker;
  task.blocker = "";
  if (task.status === "BLOCKED") task.status = "IN_PROGRESS";
  await task.save();
  await recordActivity({
    taskId,
    userId: user.id,
    type: "BLOCKER_REMOVED",
    message: meetingId
      ? `Resolved during meeting: ${resolution}`
      : `Blocker resolved: ${resolution}. Previous: ${previous}`,
    previousStatus: "BLOCKED",
    newStatus: task.status as TaskStatus,
  });
  revalidateWork();
  return { ok: true };
}

export async function createMeetingAction(input: unknown) {
  const user = await requireUser();
  if (!isLeadership(user)) return { error: "Not permitted." };
  const data = meetingSchema.parse(input);
  await connectDB();
  const meeting = await Meeting.create({
    ...data,
    date: new Date(data.date),
    createdBy: user.id,
    hostId: user.id,
    status: "SCHEDULED",
  });
  await writeAudit({
    actorId: user.id,
    action: "MEETING_CREATED",
    entityType: "Meeting",
    entityId: String(meeting._id),
    details: { title: meeting.title },
  });
  for (const participantId of data.participantIds ?? []) {
    if (participantId === user.id) continue;
    await notify({
      userId: participantId,
      type: "MEETING_CREATED",
      title: "Meeting scheduled",
      message: `${meeting.title} on ${new Date(data.date).toLocaleDateString()}`,
      link: `/meetings/${String(meeting._id)}`,
    });
  }
  revalidatePath("/meetings");
  revalidatePath("/calendar");
  return { id: String(meeting._id) };
}

export async function startMeetingAction(id: string) {
  const user = await requireUser();
  if (!isLeadership(user)) return { error: "Not permitted." };
  await connectDB();
  const meeting = await Meeting.findById(id);
  if (!meeting) return { error: "Not found." };
  meeting.status = "LIVE";
  meeting.liveState = {
    ...(meeting.liveState ?? {}),
    currentSlideIndex: meeting.liveState?.currentSlideIndex ?? 0,
    isPaused: false,
    startedAt: new Date(),
  };
  await meeting.save();
  await writeAudit({
    actorId: user.id,
    action: "MEETING_STARTED",
    entityType: "Meeting",
    entityId: id,
  });
  for (const participantId of meeting.participantIds ?? []) {
    await notify({
      userId: String(participantId),
      type: "MEETING_STARTED",
      title: "Meeting is live",
      message: `${meeting.title} has started.`,
      link: `/meetings/${id}/present`,
    });
  }
  revalidatePath(`/meetings/${id}`);
  revalidatePath("/meetings");
  return { ok: true };
}

export async function updateLiveStateAction(
  id: string,
  patch: { currentSlideIndex?: number; currentPresenterId?: string; isPaused?: boolean },
) {
  const user = await requireUser();
  if (!isLeadership(user)) return { error: "Not permitted." };
  await connectDB();
  const meeting = await Meeting.findById(id);
  if (!meeting) return { error: "Not found." };
  meeting.liveState = {
    ...(meeting.liveState ?? {}),
    ...patch,
  };
  await meeting.save();
  return { ok: true, liveState: JSON.parse(JSON.stringify(meeting.liveState)) };
}

export async function endMeetingAction(id: string, notes?: string) {
  const user = await requireUser();
  if (!isLeadership(user)) return { error: "Not permitted." };
  await connectDB();
  const meeting = await Meeting.findById(id);
  if (!meeting) return { error: "Not found." };
  const startedAt = meeting.liveState?.startedAt
    ? new Date(meeting.liveState.startedAt)
    : new Date();
  const endedAt = new Date();
  const durationMinutes = Math.max(1, Math.round((endedAt.getTime() - startedAt.getTime()) / 60000));
  meeting.status = "COMPLETED";
  meeting.notes = notes ?? meeting.notes;
  meeting.liveState = {
    ...(meeting.liveState ?? {}),
    endedAt,
    isPaused: false,
  };
  meeting.durationMinutes = durationMinutes;
  await meeting.save();
  await writeAudit({
    actorId: user.id,
    action: "MEETING_ENDED",
    entityType: "Meeting",
    entityId: id,
    details: { durationMinutes },
  });
  revalidatePath(`/meetings/${id}`);
  revalidatePath("/meetings");
  revalidatePath("/reports");
  return { ok: true };
}

export async function saveMeetingNotesAction(id: string, notes: string, summary?: string) {
  const user = await requireUser();
  if (!isLeadership(user)) return { error: "Not permitted." };
  await connectDB();
  await Meeting.findByIdAndUpdate(id, { notes, ...(summary ? { summary } : {}) });
  revalidatePath(`/meetings/${id}`);
  return { ok: true };
}

export async function createDecisionAction(input: unknown) {
  const user = await requireUser();
  if (!isLeadership(user)) return { error: "Not permitted." };
  const data = decisionSchema.parse(input);
  await connectDB();
  const decision = await Decision.create({ ...data, createdBy: user.id });
  await writeAudit({
    actorId: user.id,
    action: "DECISION_RECORDED",
    entityType: "Decision",
    entityId: String(decision._id),
    details: { title: decision.title },
  });
  revalidatePath(`/meetings/${data.meetingId}`);
  revalidatePath(`/meetings/${data.meetingId}/present`);
  return { id: String(decision._id) };
}

export async function createActionItemAction(input: unknown) {
  const user = await requireUser();
  if (!isLeadership(user)) return { error: "Not permitted." };
  const data = actionItemSchema.parse(input);
  await connectDB();
  let deliverableId = data.deliverableId;
  if (!deliverableId) {
    const first = await Deliverable.findOne({ projectId: data.projectId });
    if (!first) return { error: "Project has no deliverable to attach this action item." };
    deliverableId = String(first._id);
  }
  const meeting = await Meeting.findById(data.meetingId);
  const task = await Task.create({
    title: data.title,
    projectId: data.projectId,
    deliverableId,
    assignedTo: data.ownerId,
    createdBy: user.id,
    status: "NOT_STARTED",
    priority: data.priority ?? "MEDIUM",
    progress: 0,
    weight: 1,
    dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
    workPlanMonth: meeting?.workPlanMonth ?? currentWorkPlanMonth(),
    meetingId: data.meetingId,
    nextAction: data.title,
  });
  await recordActivity({
    taskId: String(task._id),
    userId: user.id,
    type: "ASSIGNMENT_CHANGED",
    message: `Action item created from meeting: ${data.title}`,
  });
  await writeAudit({
    actorId: user.id,
    action: "TASK_CREATED",
    entityType: "Task",
    entityId: String(task._id),
    details: { fromMeeting: data.meetingId },
  });
  await notify({
    userId: data.ownerId,
    type: "TASK_ASSIGNED",
    title: "Action item assigned",
    message: data.title,
    link: `/tasks/${String(task._id)}`,
  });
  await recalculateProgress({ deliverableId, projectId: data.projectId });
  revalidateWork();
  return { id: String(task._id) };
}

export async function markNotificationsReadAction() {
  const user = await requireUser();
  await connectDB();
  await Notification.updateMany({ userId: user.id, read: false }, { read: true });
  revalidatePath("/notifications");
}

export async function updateProfileAction(input: { jobTitle?: string; name?: string }) {
  const user = await requireUser();
  await connectDB();
  await User.findByIdAndUpdate(user.id, {
    ...(input.name ? { name: input.name } : {}),
    ...(input.jobTitle ? { jobTitle: input.jobTitle } : {}),
  });
  revalidatePath("/settings");
  return { ok: true };
}
