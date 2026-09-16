import { randomBytes } from "crypto";
import { connectDB } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import {
  Comment,
  Decision,
  Deliverable,
  Department,
  Meeting,
  MeetingStatus,
  MonthFocus,
  Project,
  SupportRequest,
  Task,
  User,
} from "@/models";
import {
  COMMENT_TARGETS,
  MEETING_STATUSES,
  PRIORITIES,
  PROJECT_STATUSES,
  ROLES,
  SUPPORT_STATUSES,
  TASK_STATUSES,
  type CommentTarget,
  type Priority,
  type ProjectStatus,
  type Role,
  type SupportStatus,
  type TaskStatus,
} from "@/types";

export const WORKPACK_FORMAT = "workplan-team-pack";
export const WORKPACK_VERSION = 1;
export const WORKPACK_MAX_BYTES = 12 * 1024 * 1024;

type PackPerson = {
  id: string;
  name: string;
  email: string;
  role: Role;
  jobTitle: string;
  avatar: string;
  departmentId: string;
  managerId: string;
  isActive: boolean;
};

type PackDepartment = {
  id: string;
  name: string;
  description: string;
  managerId: string;
  memberIds: string[];
};

type PackProject = {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  memberIds: string[];
  departmentId: string;
  status: ProjectStatus;
  priority: Priority;
  startDate: string | null;
  targetDate: string | null;
  progress: number;
  color: string;
};

type PackDeliverable = {
  id: string;
  projectId: string;
  name: string;
  description: string;
  ownerId: string;
  progress: number;
  status: ProjectStatus;
  priority: Priority;
  startDate: string | null;
  dueDate: string | null;
};

type PackTask = {
  id: string;
  title: string;
  description: string;
  projectId: string;
  deliverableId: string;
  assignedTo: string;
  createdBy: string;
  status: TaskStatus;
  priority: Priority;
  progress: number;
  weight: number;
  startDate: string | null;
  dueDate: string | null;
  completedAt: string | null;
  actionsTaken: string[];
  nextAction: string;
  nextActions: string[];
  supportNeeded: boolean;
  supportDescription: string;
  blocker: string;
  blockedBy: string;
  dependencyIds: string[];
  tags: string[];
  workPlanMonth: string;
  talkingPoints: string[];
  meetingId: string;
};

type PackMonthFocus = {
  month: string;
  summary: string;
  setBy: string;
};

type PackMeeting = {
  id: string;
  title: string;
  date: string | null;
  startTime: string;
  endTime: string;
  participantIds: string[];
  departmentIds: string[];
  projectIds: string[];
  agenda: string[];
  notes: string;
  summary: string;
  status: string;
  createdBy: string;
  hostId: string;
  workPlanMonth: string;
  durationMinutes: number | null;
};

type PackMeetingStatus = {
  taskId: string;
  meetingDate: string;
  actionsTaken: string[];
  nextActions: string[];
  supportDescription: string;
  status: TaskStatus;
  progress: number;
  updatedBy: string;
};

type PackSupport = {
  taskId: string;
  requestedBy: string;
  assignedTo: string;
  description: string;
  status: SupportStatus;
  resolution: string;
  resolvedAt: string | null;
  meetingId: string;
};

type PackComment = {
  targetType: CommentTarget;
  targetId: string;
  userId: string;
  body: string;
};

type PackDecision = {
  meetingId: string;
  title: string;
  description: string;
  decision: string;
  ownerId: string;
  createdBy: string;
};

export type TeamWorkpack = {
  format: typeof WORKPACK_FORMAT;
  version: number;
  exportedAt: string;
  people: PackPerson[];
  departments: PackDepartment[];
  projects: PackProject[];
  deliverables: PackDeliverable[];
  tasks: PackTask[];
  monthFocus: PackMonthFocus[];
  meetings: PackMeeting[];
  meetingStatuses: PackMeetingStatus[];
  supportRequests: PackSupport[];
  comments: PackComment[];
  decisions: PackDecision[];
};

export type WorkpackImportCounts = {
  peopleCreated: number;
  peopleMatched: number;
  departments: number;
  projects: number;
  deliverables: number;
  tasks: number;
  monthFocus: number;
  meetings: number;
  meetingStatuses: number;
  supportRequests: number;
  comments: number;
  decisions: number;
};

function sid(value: unknown): string {
  if (value == null || value === "") return "";
  return String(value);
}

function sids(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(sid).filter(Boolean);
}

function iso(value: unknown): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function asDate(value: string | null | undefined): Date | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function inSet<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

function str(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function num(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function bool(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function strs(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function nameQuery(name: string) {
  return { name: new RegExp(`^${escapeRegex(name.trim())}$`, "i") };
}

function mapUser(
  ids: Map<string, string>,
  oldId: string | undefined,
  fallback?: string,
): string | undefined {
  if (oldId && ids.has(oldId)) return ids.get(oldId);
  return fallback;
}

function mapUsers(ids: Map<string, string>, oldIds: string[]): string[] {
  return [...new Set(oldIds.map((id) => ids.get(id)).filter((id): id is string => Boolean(id)))];
}

export async function buildTeamWorkpack(): Promise<TeamWorkpack> {
  await connectDB();
  const [
    people,
    departments,
    projects,
    deliverables,
    tasks,
    monthFocus,
    meetings,
    meetingStatuses,
    supportRequests,
    comments,
    decisions,
  ] = await Promise.all([
    User.find({}).select("-passwordHash -passwordResetToken -passwordResetExpires").lean(),
    Department.find({}).lean(),
    Project.find({}).lean(),
    Deliverable.find({}).lean(),
    Task.find({}).lean(),
    MonthFocus.find({}).lean(),
    Meeting.find({}).lean(),
    MeetingStatus.find({}).lean(),
    SupportRequest.find({}).lean(),
    Comment.find({}).lean(),
    Decision.find({}).lean(),
  ]);

  return {
    format: WORKPACK_FORMAT,
    version: WORKPACK_VERSION,
    exportedAt: new Date().toISOString(),
    people: people.map((user) => ({
      id: sid(user._id),
      name: str(user.name),
      email: str(user.email).toLowerCase(),
      role: inSet(user.role, ROLES, "TEAM_MEMBER"),
      jobTitle: str(user.jobTitle),
      avatar: str(user.avatar),
      departmentId: sid(user.departmentId),
      managerId: sid(user.managerId),
      isActive: user.isActive !== false,
    })),
    departments: departments.map((dept) => ({
      id: sid(dept._id),
      name: str(dept.name),
      description: str(dept.description),
      managerId: sid(dept.managerId),
      memberIds: sids(dept.memberIds),
    })),
    projects: projects.map((project) => ({
      id: sid(project._id),
      name: str(project.name),
      description: str(project.description),
      ownerId: sid(project.ownerId),
      memberIds: sids(project.memberIds),
      departmentId: sid(project.departmentId),
      status: inSet(project.status, PROJECT_STATUSES, "ACTIVE"),
      priority: inSet(project.priority, PRIORITIES, "MEDIUM"),
      startDate: iso(project.startDate),
      targetDate: iso(project.targetDate),
      progress: num(project.progress),
      color: str(project.color, "#2563eb"),
    })),
    deliverables: deliverables.map((item) => ({
      id: sid(item._id),
      projectId: sid(item.projectId),
      name: str(item.name),
      description: str(item.description),
      ownerId: sid(item.ownerId),
      progress: num(item.progress),
      status: inSet(item.status, PROJECT_STATUSES, "ACTIVE"),
      priority: inSet(item.priority, PRIORITIES, "MEDIUM"),
      startDate: iso(item.startDate),
      dueDate: iso(item.dueDate),
    })),
    tasks: tasks.map((task) => ({
      id: sid(task._id),
      title: str(task.title),
      description: str(task.description),
      projectId: sid(task.projectId),
      deliverableId: sid(task.deliverableId),
      assignedTo: sid(task.assignedTo),
      createdBy: sid(task.createdBy),
      status: inSet(task.status, TASK_STATUSES, "NOT_STARTED"),
      priority: inSet(task.priority, PRIORITIES, "MEDIUM"),
      progress: num(task.progress),
      weight: Math.max(1, num(task.weight, 1)),
      startDate: iso(task.startDate),
      dueDate: iso(task.dueDate),
      completedAt: iso(task.completedAt),
      actionsTaken: strs(task.actionsTaken),
      nextAction: str(task.nextAction),
      nextActions: strs(task.nextActions),
      supportNeeded: bool(task.supportNeeded),
      supportDescription: str(task.supportDescription),
      blocker: str(task.blocker),
      blockedBy: sid(task.blockedBy),
      dependencyIds: sids(task.dependencyIds),
      tags: strs(task.tags),
      workPlanMonth: str(task.workPlanMonth),
      talkingPoints: strs(task.talkingPoints),
      meetingId: sid(task.meetingId),
    })),
    monthFocus: monthFocus.map((item) => ({
      month: str(item.month),
      summary: str(item.summary),
      setBy: sid(item.setBy),
    })),
    meetings: meetings.map((meeting) => ({
      id: sid(meeting._id),
      title: str(meeting.title),
      date: iso(meeting.date),
      startTime: str(meeting.startTime, "15:30"),
      endTime: str(meeting.endTime, "16:30"),
      participantIds: sids(meeting.participantIds),
      departmentIds: sids(meeting.departmentIds),
      projectIds: sids(meeting.projectIds),
      agenda: strs(meeting.agenda),
      notes: str(meeting.notes),
      summary: str(meeting.summary),
      status: str(meeting.status, "SCHEDULED"),
      createdBy: sid(meeting.createdBy),
      hostId: sid(meeting.hostId),
      workPlanMonth: str(meeting.workPlanMonth),
      durationMinutes:
        typeof meeting.durationMinutes === "number" ? meeting.durationMinutes : null,
    })),
    meetingStatuses: meetingStatuses.map((item) => ({
      taskId: sid(item.taskId),
      meetingDate: str(item.meetingDate),
      actionsTaken: strs(item.actionsTaken),
      nextActions: strs(item.nextActions),
      supportDescription: str(item.supportDescription),
      status: inSet(item.status, TASK_STATUSES, "NOT_STARTED"),
      progress: num(item.progress),
      updatedBy: sid(item.updatedBy),
    })),
    supportRequests: supportRequests.map((item) => ({
      taskId: sid(item.taskId),
      requestedBy: sid(item.requestedBy),
      assignedTo: sid(item.assignedTo),
      description: str(item.description),
      status: inSet(item.status, SUPPORT_STATUSES, "OPEN"),
      resolution: str(item.resolution),
      resolvedAt: iso(item.resolvedAt),
      meetingId: sid(item.meetingId),
    })),
    comments: comments.map((item) => ({
      targetType: inSet(item.targetType, COMMENT_TARGETS, "TASK"),
      targetId: sid(item.targetId),
      userId: sid(item.userId),
      body: str(item.body),
    })),
    decisions: decisions.map((item) => ({
      meetingId: sid(item.meetingId),
      title: str(item.title),
      description: str(item.description),
      decision: str(item.decision),
      ownerId: sid(item.ownerId),
      createdBy: sid(item.createdBy),
    })),
  };
}

export function parseTeamWorkpack(raw: unknown): TeamWorkpack | { error: string } {
  if (!raw || typeof raw !== "object") return { error: "That file is not a WorkPlan pack." };
  const pack = raw as Record<string, unknown>;
  if (pack.format !== WORKPACK_FORMAT) {
    return { error: "That file is not a WorkPlan team pack." };
  }
  if (pack.version !== WORKPACK_VERSION) {
    return { error: "This pack is from a different WorkPlan version." };
  }
  if (!Array.isArray(pack.people) || !Array.isArray(pack.projects) || !Array.isArray(pack.tasks)) {
    return { error: "That pack is missing team work." };
  }
  return pack as TeamWorkpack;
}

export async function importTeamWorkpack(
  pack: TeamWorkpack,
  actor: { id: string; email: string },
): Promise<WorkpackImportCounts> {
  await connectDB();
  const counts: WorkpackImportCounts = {
    peopleCreated: 0,
    peopleMatched: 0,
    departments: 0,
    projects: 0,
    deliverables: 0,
    tasks: 0,
    monthFocus: 0,
    meetings: 0,
    meetingStatuses: 0,
    supportRequests: 0,
    comments: 0,
    decisions: 0,
  };

  const userIds = new Map<string, string>();
  const actorEmail = actor.email.toLowerCase();

  for (const person of pack.people ?? []) {
    const email = str(person.email).toLowerCase().trim();
    if (!email || !email.includes("@")) continue;
    const name = str(person.name, email);
    const role = inSet(person.role, ROLES, "TEAM_MEMBER");
    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        name,
        email,
        role,
        jobTitle: str(person.jobTitle),
        avatar: str(person.avatar),
        isActive: person.isActive !== false,
        passwordHash: await hashPassword(randomBytes(32).toString("hex")),
        invitePending: true,
        credentialsVersion: 0,
      });
      counts.peopleCreated += 1;
    } else {
      const nextRole = email === actorEmail ? user.role : role;
      await User.updateOne(
        { _id: user._id },
        {
          $set: {
            name,
            jobTitle: str(person.jobTitle, str(user.jobTitle)),
            avatar: str(person.avatar, str(user.avatar)),
            role: nextRole,
            isActive: person.isActive !== false,
          },
        },
      );
      counts.peopleMatched += 1;
    }
    userIds.set(sid(person.id), String(user._id));
  }

  if (!userIds.size) {
    userIds.set(actor.id, actor.id);
  }

  const fallbackUser = actor.id;

  const departmentIds = new Map<string, string>();
  for (const dept of pack.departments ?? []) {
    const name = str(dept.name).trim();
    if (!name) continue;
    const payload = {
      name,
      description: str(dept.description),
      managerId: mapUser(userIds, dept.managerId),
      memberIds: mapUsers(userIds, dept.memberIds ?? []),
    };
    let existing = await Department.findOne(nameQuery(name));
    if (!existing) existing = await Department.create(payload);
    else await Department.updateOne({ _id: existing._id }, { $set: payload });
    departmentIds.set(sid(dept.id), String(existing._id));
    counts.departments += 1;
  }

  for (const person of pack.people ?? []) {
    const destId = userIds.get(sid(person.id));
    if (!destId) continue;
    await User.updateOne(
      { _id: destId },
      {
        $set: {
          departmentId: departmentIds.get(sid(person.departmentId)),
          managerId: mapUser(userIds, person.managerId),
        },
      },
    );
  }

  const projectIds = new Map<string, string>();
  for (const project of pack.projects ?? []) {
    const name = str(project.name).trim();
    if (!name) continue;
    const payload = {
      name,
      description: str(project.description),
      ownerId: mapUser(userIds, project.ownerId, fallbackUser),
      memberIds: mapUsers(userIds, project.memberIds ?? []),
      departmentId: departmentIds.get(sid(project.departmentId)),
      status: inSet(project.status, PROJECT_STATUSES, "ACTIVE"),
      priority: inSet(project.priority, PRIORITIES, "MEDIUM"),
      startDate: asDate(project.startDate),
      targetDate: asDate(project.targetDate),
      progress: num(project.progress),
      color: str(project.color, "#2563eb"),
    };
    let existing = await Project.findOne(nameQuery(name));
    if (!existing) existing = await Project.create(payload);
    else await Project.updateOne({ _id: existing._id }, { $set: payload });
    projectIds.set(sid(project.id), String(existing._id));
    counts.projects += 1;
  }

  const deliverableIds = new Map<string, string>();
  for (const item of pack.deliverables ?? []) {
    const name = str(item.name).trim();
    const projectId = projectIds.get(sid(item.projectId));
    if (!name || !projectId) continue;
    const payload = {
      projectId,
      name,
      description: str(item.description),
      ownerId: mapUser(userIds, item.ownerId, fallbackUser),
      progress: num(item.progress),
      status: inSet(item.status, PROJECT_STATUSES, "ACTIVE"),
      priority: inSet(item.priority, PRIORITIES, "MEDIUM"),
      startDate: asDate(item.startDate),
      dueDate: asDate(item.dueDate),
    };
    let existing = await Deliverable.findOne({ projectId, ...nameQuery(name) });
    if (!existing) existing = await Deliverable.create(payload);
    else await Deliverable.updateOne({ _id: existing._id }, { $set: payload });
    deliverableIds.set(sid(item.id), String(existing._id));
    counts.deliverables += 1;
  }

  const taskIds = new Map<string, string>();
  const pendingDeps: { destId: string; oldDeps: string[] }[] = [];
  for (const task of pack.tasks ?? []) {
    const projectId = projectIds.get(sid(task.projectId));
    const deliverableId = deliverableIds.get(sid(task.deliverableId));
    const title = str(task.title).trim();
    const workPlanMonth = str(task.workPlanMonth).trim();
    if (!projectId || !deliverableId || !title || !workPlanMonth) continue;
    const assignedTo = mapUser(userIds, task.assignedTo);
    const payload = {
      title,
      description: str(task.description),
      projectId,
      deliverableId,
      assignedTo,
      createdBy: mapUser(userIds, task.createdBy, fallbackUser),
      status: inSet(task.status, TASK_STATUSES, "NOT_STARTED"),
      priority: inSet(task.priority, PRIORITIES, "MEDIUM"),
      progress: num(task.progress),
      weight: Math.max(1, num(task.weight, 1)),
      startDate: asDate(task.startDate),
      dueDate: asDate(task.dueDate),
      completedAt: asDate(task.completedAt),
      actionsTaken: strs(task.actionsTaken),
      nextAction: str(task.nextAction),
      nextActions: strs(task.nextActions),
      supportNeeded: bool(task.supportNeeded),
      supportDescription: str(task.supportDescription),
      blocker: str(task.blocker),
      blockedBy: mapUser(userIds, task.blockedBy),
      tags: strs(task.tags),
      workPlanMonth,
      talkingPoints: strs(task.talkingPoints),
    };
    const query: Record<string, unknown> = { projectId, deliverableId, title, workPlanMonth };
    if (assignedTo) query.assignedTo = assignedTo;
    else query.$or = [{ assignedTo: null }, { assignedTo: { $exists: false } }];
    let existing = await Task.findOne(query);
    if (!existing) existing = await Task.create(payload);
    else await Task.updateOne({ _id: existing._id }, { $set: payload });
    taskIds.set(sid(task.id), String(existing._id));
    if (task.dependencyIds?.length) {
      pendingDeps.push({ destId: String(existing._id), oldDeps: task.dependencyIds });
    }
    counts.tasks += 1;
  }

  for (const item of pendingDeps) {
    const dependencyIds = item.oldDeps
      .map((id) => taskIds.get(id))
      .filter((id): id is string => Boolean(id));
    await Task.updateOne({ _id: item.destId }, { $set: { dependencyIds } });
  }

  for (const item of pack.monthFocus ?? []) {
    const month = str(item.month).trim();
    if (!month) continue;
    await MonthFocus.findOneAndUpdate(
      { month },
      { $set: { month, summary: str(item.summary), setBy: mapUser(userIds, item.setBy, fallbackUser) } },
      { upsert: true },
    );
    counts.monthFocus += 1;
  }

  const meetingIds = new Map<string, string>();
  for (const meeting of pack.meetings ?? []) {
    const title = str(meeting.title).trim();
    const date = asDate(meeting.date);
    if (!title || !date) continue;
    const payload = {
      title,
      date,
      startTime: str(meeting.startTime, "15:30"),
      endTime: str(meeting.endTime, "16:30"),
      participantIds: mapUsers(userIds, meeting.participantIds ?? []),
      departmentIds: (meeting.departmentIds ?? [])
        .map((id) => departmentIds.get(id))
        .filter((id): id is string => Boolean(id)),
      projectIds: (meeting.projectIds ?? [])
        .map((id) => projectIds.get(id))
        .filter((id): id is string => Boolean(id)),
      agenda: strs(meeting.agenda),
      notes: str(meeting.notes),
      summary: str(meeting.summary),
      status: inSet(meeting.status, MEETING_STATUSES, "SCHEDULED"),
      createdBy: mapUser(userIds, meeting.createdBy, fallbackUser),
      hostId: mapUser(userIds, meeting.hostId, fallbackUser),
      workPlanMonth: str(meeting.workPlanMonth),
      durationMinutes: meeting.durationMinutes ?? undefined,
    };
    let existing = await Meeting.findOne({ title, date });
    if (!existing) existing = await Meeting.create(payload);
    else await Meeting.updateOne({ _id: existing._id }, { $set: payload });
    meetingIds.set(sid(meeting.id), String(existing._id));
    counts.meetings += 1;
  }

  for (const task of pack.tasks ?? []) {
    const destId = taskIds.get(sid(task.id));
    const meetingId = meetingIds.get(sid(task.meetingId));
    if (destId && meetingId) {
      await Task.updateOne({ _id: destId }, { $set: { meetingId } });
    }
  }

  for (const item of pack.meetingStatuses ?? []) {
    const taskId = taskIds.get(sid(item.taskId));
    const meetingDate = str(item.meetingDate).trim();
    if (!taskId || !meetingDate) continue;
    await MeetingStatus.findOneAndUpdate(
      { taskId, meetingDate },
      {
        $set: {
          taskId,
          meetingDate,
          actionsTaken: strs(item.actionsTaken),
          nextActions: strs(item.nextActions),
          supportDescription: str(item.supportDescription),
          status: inSet(item.status, TASK_STATUSES, "NOT_STARTED"),
          progress: num(item.progress),
          updatedBy: mapUser(userIds, item.updatedBy, fallbackUser),
        },
      },
      { upsert: true },
    );
    counts.meetingStatuses += 1;
  }

  for (const item of pack.supportRequests ?? []) {
    const taskId = taskIds.get(sid(item.taskId));
    const description = str(item.description).trim();
    if (!taskId || !description) continue;
    const payload = {
      taskId,
      requestedBy: mapUser(userIds, item.requestedBy, fallbackUser),
      assignedTo: mapUser(userIds, item.assignedTo),
      description,
      status: inSet(item.status, SUPPORT_STATUSES, "OPEN"),
      resolution: str(item.resolution),
      resolvedAt: asDate(item.resolvedAt),
      meetingId: meetingIds.get(sid(item.meetingId)),
    };
    const existing = await SupportRequest.findOne({ taskId, description });
    if (!existing) await SupportRequest.create(payload);
    else await SupportRequest.updateOne({ _id: existing._id }, { $set: payload });
    counts.supportRequests += 1;
  }

  for (const item of pack.comments ?? []) {
    const userId = mapUser(userIds, item.userId);
    const body = str(item.body).trim();
    if (!userId || !body) continue;
    let targetId = "";
    if (item.targetType === "TASK") targetId = taskIds.get(sid(item.targetId)) ?? "";
    if (item.targetType === "PROJECT") targetId = projectIds.get(sid(item.targetId)) ?? "";
    if (item.targetType === "MEETING") targetId = meetingIds.get(sid(item.targetId)) ?? "";
    if (!targetId) continue;
    const existing = await Comment.findOne({
      targetType: item.targetType,
      targetId,
      userId,
      body,
    });
    if (!existing) {
      await Comment.create({
        targetType: inSet(item.targetType, COMMENT_TARGETS, "TASK"),
        targetId,
        userId,
        body,
      });
    }
    counts.comments += 1;
  }

  for (const item of pack.decisions ?? []) {
    const meetingId = meetingIds.get(sid(item.meetingId));
    const title = str(item.title).trim();
    const decision = str(item.decision).trim();
    if (!meetingId || !title || !decision) continue;
    const payload = {
      meetingId,
      title,
      description: str(item.description),
      decision,
      ownerId: mapUser(userIds, item.ownerId),
      createdBy: mapUser(userIds, item.createdBy, fallbackUser),
    };
    const existing = await Decision.findOne({ meetingId, title });
    if (!existing) await Decision.create(payload);
    else await Decision.updateOne({ _id: existing._id }, { $set: payload });
    counts.decisions += 1;
  }

  return counts;
}
