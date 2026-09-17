import { randomBytes } from "crypto";
import { connectDB } from "@/lib/db";
import { currentWorkPlanMonth } from "@/lib/dates";
import { hashPassword } from "@/lib/password";
import { recalculateProgress } from "@/lib/services/progress";
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
export const PEOPLE_WORK_FORMAT = "workplan-people-work";
export const WORKPACK_VERSION = 1;
export const WORKPACK_MAX_BYTES = 12 * 1024 * 1024;

export const PEOPLE_WORK_CSV_HEADERS = [
  "project",
  "title",
  "assignees",
  "description",
  "deliverable",
  "status",
  "progress",
  "priority",
  "month",
  "next_action",
  "actions_taken",
  "support",
  "blocker",
  "due_date",
] as const;

export type TransferRow = {
  project: string;
  title: string;
  assignees: string[];
  description: string;
  deliverable: string;
  status: string;
  progress: number;
  priority: string;
  month: string;
  nextAction: string;
  actionsTaken: string[];
  support: string;
  blocker: string;
  dueDate: string | null;
};

export type PeopleWorkRow = {
  person: string;
  email: string;
  jobTitle: string;
  project: string;
  deliverable: string;
  task: string;
  description: string;
  status: string;
  progress: number;
  priority: string;
  month: string;
  nextAction: string;
  actionsTaken: string[];
  support: string;
  blocker: string;
  dueDate: string | null;
};

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
  projectsMatched: number;
  projectsCreated: number;
  unmatchedProjects: string[];
  deliverables: number;
  deliverablesMatched: number;
  deliverablesCreated: number;
  tasks: number;
  tasksUpdated: number;
  tasksCreated: number;
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

function normalizeName(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

function nameQuery(name: string) {
  return { name: new RegExp(`^${escapeRegex(name.trim())}$`, "i") };
}

function titleQuery(title: string) {
  return { title: new RegExp(`^${escapeRegex(title.trim())}$`, "i") };
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
  if (Array.isArray(pack.rows)) {
    const rows = parseTransferObjects(pack.rows);
    if ("error" in rows) return rows;
    return packFromTransferRows(rows);
  }
  if (pack.format !== WORKPACK_FORMAT) {
    return {
      error: "That file needs rows with project, title, and assignees.",
    };
  }
  if (pack.version !== WORKPACK_VERSION) {
    return { error: "This pack is from a different WorkPlan version." };
  }
  if (!Array.isArray(pack.people) || !Array.isArray(pack.projects) || !Array.isArray(pack.tasks)) {
    return { error: "That pack is missing team work." };
  }
  return pack as TeamWorkpack;
}

function csvCell(value: unknown) {
  const text = String(value ?? "");
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function peopleWorkToCsv(rows: TransferRow[]) {
  const lines = [
    PEOPLE_WORK_CSV_HEADERS.join(","),
    ...rows.map((row) =>
      [
        row.project,
        row.title,
        row.assignees.join(";"),
        row.description,
        row.deliverable,
        row.status,
        row.progress,
        row.priority,
        row.month,
        row.nextAction,
        row.actionsTaken.join(" | "),
        row.support,
        row.blocker,
        row.dueDate ?? "",
      ]
        .map(csvCell)
        .join(","),
    ),
  ];
  return `${lines.join("\r\n")}\r\n`;
}

export function transferRowsToJson(rows: TransferRow[]) {
  return `${JSON.stringify(
    {
      rows: rows.map((row) => ({
        project: row.project,
        title: row.title,
        assignees: row.assignees,
        description: row.description,
        deliverable: row.deliverable,
        status: row.status,
        progress: row.progress,
        priority: row.priority,
        month: row.month,
        next_action: row.nextAction,
        actions_taken: row.actionsTaken,
        support: row.support,
        blocker: row.blocker,
        due_date: row.dueDate,
      })),
    },
    null,
    2,
  )}\n`;
}

function parseAssigneeList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return [...new Set(value.flatMap((item) => parseAssigneeList(item)))];
  }
  return [
    ...new Set(
      String(value ?? "")
        .split(/[;,|]/)
        .map((part) => part.trim().toLowerCase())
        .filter(Boolean),
    ),
  ];
}

function pickField(record: Record<string, unknown>, keys: string[]) {
  const lookup = new Map<string, unknown>();
  for (const [key, nested] of Object.entries(record)) {
    lookup.set(headerKey(key), nested);
  }
  for (const key of keys) {
    if (lookup.has(key)) return lookup.get(key);
  }
  return undefined;
}

function parseListField(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  return String(value ?? "")
    .split(/\s*\|\s*|\n/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function asNumber(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Number.parseInt(String(value ?? "").replace("%", ""), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function transferFromUnknown(raw: unknown): TransferRow | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  const project = str(pickField(record, ["project", "project name", "stream"])).trim();
  const title = str(pickField(record, ["title", "task"])).trim();
  const deliverable = str(pickField(record, ["deliverable"])).trim() || title;
  const assignees = parseAssigneeList(
    pickField(record, ["assignees", "owners", "assigned to", "email"]),
  );
  if (!project || !title || !assignees.length) return null;
  const nextParts = parseListField(
    pickField(record, ["next action", "next actions", "nextaction"]),
  );
  return {
    project,
    title,
    assignees,
    description: str(pickField(record, ["description", "details", "notes", "body"])),
    deliverable,
    status: str(pickField(record, ["status"]), "NOT_STARTED"),
    progress: asNumber(pickField(record, ["progress"])),
    priority: str(pickField(record, ["priority"]), "MEDIUM"),
    month: str(pickField(record, ["month", "work plan month", "workplanmonth"])),
    nextAction: nextParts[0] || "",
    actionsTaken: parseListField(pickField(record, ["actions taken", "actionstaken"])),
    support: str(pickField(record, ["support", "support description", "supportdescription"])),
    blocker: str(pickField(record, ["blocker"])),
    dueDate: str(pickField(record, ["due date", "duedate"])) || null,
  };
}

function parseTransferObjects(items: unknown[]): TransferRow[] | { error: string } {
  const rows = items.map(transferFromUnknown).filter((row): row is TransferRow => Boolean(row));
  if (!rows.length) {
    return { error: "Each row needs project, title, and assignees." };
  }
  return rows;
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  const src = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  for (let i = 0; i < src.length; i += 1) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += ch;
    }
  }
  if (cell.length || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((entry) => entry.some((value) => value.trim()));
}

function headerKey(value: string) {
  return value.trim().toLowerCase().replace(/[_-]+/g, " ");
}

export function parsePeopleWorkCsv(text: string): TransferRow[] | { error: string } {
  const table = parseCsv(text);
  if (table.length < 2) return { error: "That CSV has no work rows." };
  const headers = table[0].map(headerKey);
  const col = (...names: string[]) => {
    for (const name of names) {
      const index = headers.indexOf(name);
      if (index >= 0) return index;
    }
    return -1;
  };
  const project = col("project", "project name", "stream");
  const title = col("title", "task", "deliverable");
  const assignees = col("assignees", "owners", "assigned to", "email");
  if (project < 0 || title < 0 || assignees < 0) {
    return {
      error: "That CSV needs columns project, title, and assignees.",
    };
  }
  return parseTransferObjects(
    table.slice(1).map((entry) => {
      const record: Record<string, string> = {};
      table[0].forEach((header, index) => {
        record[header] = entry[index] ?? "";
      });
      return record;
    }),
  );
}

function packFromTransferRows(rows: TransferRow[]): TeamWorkpack {
  const expanded: PeopleWorkRow[] = [];
  const fallbackMonth = currentWorkPlanMonth();
  for (const row of rows) {
    for (const email of row.assignees) {
      expanded.push({
        person: email,
        email,
        jobTitle: "",
        project: row.project,
        deliverable: row.deliverable || row.title,
        task: row.title,
        description: row.description,
        status: row.status || "NOT_STARTED",
        progress: row.progress,
        priority: row.priority || "MEDIUM",
        month: row.month || fallbackMonth,
        nextAction: row.nextAction,
        actionsTaken: row.actionsTaken,
        support: row.support,
        blocker: row.blocker,
        dueDate: row.dueDate,
      });
    }
  }
  return packFromPeopleRows(expanded);
}

function packFromPeopleRows(rows: PeopleWorkRow[]): TeamWorkpack {
  const people = new Map<string, PackPerson>();
  const projects = new Map<string, PackProject>();
  const deliverables = new Map<string, PackDeliverable>();
  const tasks: PackTask[] = [];

  for (const row of rows) {
    const email = row.email.trim().toLowerCase();
    if (!email || !row.project || !row.deliverable || !row.task) continue;
    if (!people.has(email)) {
      people.set(email, {
        id: email,
        name: row.person || email,
        email,
        role: "TEAM_MEMBER",
        jobTitle: row.jobTitle,
        avatar: "",
        departmentId: "",
        managerId: "",
        isActive: true,
      });
    }
    const projectId = `project:${row.project.toLowerCase()}`;
    if (!projects.has(projectId)) {
      projects.set(projectId, {
        id: projectId,
        name: row.project,
        description: "",
        ownerId: email,
        memberIds: [email],
        departmentId: "",
        status: "ACTIVE",
        priority: inSet(row.priority, PRIORITIES, "MEDIUM"),
        startDate: null,
        targetDate: null,
        progress: 0,
        color: "#2563eb",
      });
    } else {
      const project = projects.get(projectId)!;
      if (!project.memberIds.includes(email)) project.memberIds.push(email);
    }
    const deliverableId = `${projectId}|${row.deliverable.toLowerCase()}`;
    if (!deliverables.has(deliverableId)) {
      deliverables.set(deliverableId, {
        id: deliverableId,
        projectId,
        name: row.deliverable,
        description: "",
        ownerId: email,
        progress: num(row.progress),
        status: "ACTIVE",
        priority: inSet(row.priority, PRIORITIES, "MEDIUM"),
        startDate: null,
        dueDate: null,
      });
    }
    const month = row.month || currentWorkPlanMonth();
    tasks.push({
      id: `${email}|${deliverableId}|${row.task}|${month}`,
      title: row.task,
      description: row.description,
      projectId,
      deliverableId,
      assignedTo: email,
      createdBy: email,
      status: inSet(row.status, TASK_STATUSES, "NOT_STARTED"),
      priority: inSet(row.priority, PRIORITIES, "MEDIUM"),
      progress: Math.min(100, Math.max(0, num(row.progress))),
      weight: 1,
      startDate: null,
      dueDate: row.dueDate,
      completedAt: null,
      actionsTaken: row.actionsTaken,
      nextAction: row.nextAction,
      nextActions: row.nextAction ? [row.nextAction] : [],
      supportNeeded: Boolean(row.support),
      supportDescription: row.support,
      blocker: row.blocker,
      blockedBy: "",
      dependencyIds: [],
      tags: [],
      workPlanMonth: month,
      talkingPoints: [],
      meetingId: "",
    });
  }

  return {
    format: WORKPACK_FORMAT,
    version: WORKPACK_VERSION,
    exportedAt: new Date().toISOString(),
    people: [...people.values()],
    departments: [],
    projects: [...projects.values()],
    deliverables: [...deliverables.values()],
    tasks,
    monthFocus: [],
    meetings: [],
    meetingStatuses: [],
    supportRequests: [],
    comments: [],
    decisions: [],
  };
}

export function parseUploadedWork(text: string): TeamWorkpack | { error: string } {
  const trimmed = text.replace(/^\uFEFF/, "").trim();
  if (!trimmed) return { error: "That file is empty." };
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      const raw = JSON.parse(trimmed) as unknown;
      if (Array.isArray(raw)) {
        const rows = parseTransferObjects(raw);
        if ("error" in rows) return rows;
        return packFromTransferRows(rows);
      }
      return parseTeamWorkpack(raw);
    } catch {
      return { error: "That JSON file is not valid." };
    }
  }
  const rows = parsePeopleWorkCsv(trimmed);
  if ("error" in rows) return rows;
  return packFromTransferRows(rows);
}

export async function buildTransferRows(): Promise<TransferRow[]> {
  await connectDB();
  const tasks = await Task.find({})
    .populate("assignedTo", "name email")
    .populate("projectId", "name")
    .populate("deliverableId", "name")
    .lean();

  const latestMonth = new Map<string, string>();
  for (const task of tasks) {
    const assigned = task.assignedTo as { email?: string } | null;
    const key = str(assigned?.email).toLowerCase() || "unassigned";
    const month = str(task.workPlanMonth);
    const previous = latestMonth.get(key);
    if (month && (!previous || month > previous)) latestMonth.set(key, month);
  }

  const rows: TransferRow[] = [];
  for (const task of tasks) {
    const assigned = task.assignedTo as { email?: string } | null;
    const email = str(assigned?.email).toLowerCase();
    if (!email) continue;
    if (str(task.workPlanMonth) !== latestMonth.get(email)) continue;
    const project = str((task.projectId as { name?: string } | null)?.name).trim();
    const title = str(task.title).trim();
    if (!project || !title) continue;
    const nextActions = strs(task.nextActions);
    const due = task.dueDate ? iso(task.dueDate) : null;
    rows.push({
      project,
      title,
      assignees: [email],
      description: str(task.description),
      deliverable: str((task.deliverableId as { name?: string } | null)?.name, title),
      status: str(task.status, "NOT_STARTED"),
      progress: num(task.progress),
      priority: str(task.priority, "MEDIUM"),
      month: str(task.workPlanMonth),
      nextAction: nextActions[0] || str(task.nextAction),
      actionsTaken: strs(task.actionsTaken),
      support: str(task.supportDescription),
      blocker: str(task.blocker),
      dueDate: due,
    });
  }

  return rows.sort((a, b) => {
    const project = a.project.localeCompare(b.project);
    if (project) return project;
    const title = a.title.localeCompare(b.title);
    if (title) return title;
    return a.assignees[0].localeCompare(b.assignees[0]);
  });
}

export async function buildPeopleWorkRows(): Promise<TransferRow[]> {
  return buildTransferRows();
}

export async function importTeamWorkpack(
  pack: TeamWorkpack,
  actor: { id: string; email: string },
  options?: { mode?: "merge" | "full" },
): Promise<WorkpackImportCounts> {
  await connectDB();
  const merge = options?.mode !== "full";
  const counts: WorkpackImportCounts = {
    peopleCreated: 0,
    peopleMatched: 0,
    departments: 0,
    projects: 0,
    projectsMatched: 0,
    projectsCreated: 0,
    unmatchedProjects: [],
    deliverables: 0,
    deliverablesMatched: 0,
    deliverablesCreated: 0,
    tasks: 0,
    tasksUpdated: 0,
    tasksCreated: 0,
    monthFocus: 0,
    meetings: 0,
    meetingStatuses: 0,
    supportRequests: 0,
    comments: 0,
    decisions: 0,
  };

  const userIds = new Map<string, string>();
  const destUsers = await User.find({}).select("email").lean();
  for (const user of destUsers) {
    const email = str(user.email).toLowerCase();
    if (email) userIds.set(email, String(user._id));
  }

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
      counts.peopleMatched += 1;
      if (!merge) {
        const nextRole = email === actor.email.toLowerCase() ? user.role : role;
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
      } else if (!str(user.jobTitle) && str(person.jobTitle)) {
        await User.updateOne({ _id: user._id }, { $set: { jobTitle: person.jobTitle } });
      }
    }
    const destId = String(user._id);
    userIds.set(sid(person.id), destId);
    userIds.set(email, destId);
  }

  if (!userIds.size) {
    userIds.set(actor.id, actor.id);
  }

  const fallbackUser = actor.id;

  const departmentIds = new Map<string, string>();
  if (!merge) {
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
  }

  const destProjects = await Project.find({}).select("name memberIds").lean();
  const projectByName = new Map(
    destProjects.map((project) => [normalizeName(str(project.name)), project]),
  );

  const projectIds = new Map<string, string>();
  for (const project of pack.projects ?? []) {
    const name = str(project.name).trim();
    if (!name) continue;
    const memberIds = mapUsers(userIds, project.memberIds ?? []);
    const ownerId = mapUser(userIds, project.ownerId, fallbackUser);
    let existing = projectByName.get(normalizeName(name));
    if (!existing) {
      existing = await Project.findOne(nameQuery(name));
    }
    if (!existing) {
      const created = await Project.create({
        name,
        description: str(project.description),
        ownerId,
        memberIds,
        departmentId: departmentIds.get(sid(project.departmentId)),
        status: inSet(project.status, PROJECT_STATUSES, "ACTIVE"),
        priority: inSet(project.priority, PRIORITIES, "MEDIUM"),
        startDate: asDate(project.startDate),
        targetDate: asDate(project.targetDate),
        progress: num(project.progress),
        color: str(project.color, "#2563eb"),
      });
      existing = created;
      counts.projectsCreated += 1;
      counts.unmatchedProjects.push(name);
      projectByName.set(normalizeName(name), created);
    } else {
      counts.projectsMatched += 1;
      if (memberIds.length) {
        await Project.updateOne(
          { _id: existing._id },
          { $addToSet: { memberIds: { $each: memberIds } } },
        );
      }
    }
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
    if (!existing) {
      existing = await Deliverable.create(payload);
      counts.deliverablesCreated += 1;
    } else {
      counts.deliverablesMatched += 1;
      const next: Record<string, unknown> = {
        progress: payload.progress,
        status: payload.status,
        priority: payload.priority,
      };
      if (payload.description) next.description = payload.description;
      if (payload.startDate) next.startDate = payload.startDate;
      if (payload.dueDate) next.dueDate = payload.dueDate;
      await Deliverable.updateOne({ _id: existing._id }, { $set: next });
    }
    deliverableIds.set(sid(item.id), String(existing._id));
    counts.deliverables += 1;
  }

  const taskIds = new Map<string, string>();
  const pendingDeps: { destId: string; oldDeps: string[] }[] = [];
  const touchedProjects = new Set<string>();
  const touchedDeliverables = new Set<string>();
  for (const task of pack.tasks ?? []) {
    const projectId = projectIds.get(sid(task.projectId));
    const deliverableId = deliverableIds.get(sid(task.deliverableId));
    const title = str(task.title).trim();
    const workPlanMonth = str(task.workPlanMonth).trim();
    if (!projectId || !deliverableId || !title || !workPlanMonth) continue;
    const assignedTo = mapUser(userIds, task.assignedTo);
    const latest: Record<string, unknown> = {
      title,
      projectId,
      deliverableId,
      assignedTo,
      status: inSet(task.status, TASK_STATUSES, "NOT_STARTED"),
      priority: inSet(task.priority, PRIORITIES, "MEDIUM"),
      progress: num(task.progress),
      workPlanMonth,
    };
    if (str(task.description)) latest.description = task.description;
    if (str(task.nextAction)) {
      latest.nextAction = task.nextAction;
      latest.nextActions = strs(task.nextActions).length ? strs(task.nextActions) : [task.nextAction];
    } else if (strs(task.nextActions).length) {
      latest.nextActions = strs(task.nextActions);
      latest.nextAction = task.nextActions[0];
    }
    if (str(task.supportDescription) || task.supportNeeded) {
      latest.supportNeeded = bool(task.supportNeeded);
      latest.supportDescription = str(task.supportDescription);
    }
    if (str(task.blocker)) latest.blocker = task.blocker;
    if (strs(task.actionsTaken).length) latest.actionsTaken = strs(task.actionsTaken);
    if (strs(task.talkingPoints).length) latest.talkingPoints = strs(task.talkingPoints);
    if (strs(task.tags).length) latest.tags = strs(task.tags);
    if (asDate(task.dueDate)) latest.dueDate = asDate(task.dueDate);
    if (asDate(task.startDate)) latest.startDate = asDate(task.startDate);
    if (asDate(task.completedAt)) latest.completedAt = asDate(task.completedAt);
    const blockedBy = mapUser(userIds, task.blockedBy);
    if (blockedBy) latest.blockedBy = blockedBy;

    const titleMatch = titleQuery(title);
    let existing = assignedTo
      ? await Task.findOne({ projectId, assignedTo, ...titleMatch, workPlanMonth })
      : await Task.findOne({
          projectId,
          ...titleMatch,
          workPlanMonth,
          $or: [{ assignedTo: null }, { assignedTo: { $exists: false } }],
        });
    if (!existing && assignedTo) {
      existing = await Task.findOne({ projectId, assignedTo, ...titleMatch }).sort({
        workPlanMonth: -1,
      });
    }
    if (!existing) {
      existing = await Task.create({
        ...latest,
        createdBy: mapUser(userIds, task.createdBy, fallbackUser),
        weight: Math.max(1, num(task.weight, 1)),
      });
      counts.tasksCreated += 1;
    } else {
      await Task.updateOne({ _id: existing._id }, { $set: latest });
      counts.tasksUpdated += 1;
    }
    taskIds.set(sid(task.id), String(existing._id));
    if (task.dependencyIds?.length) {
      pendingDeps.push({ destId: String(existing._id), oldDeps: task.dependencyIds });
    }
    touchedProjects.add(projectId);
    touchedDeliverables.add(deliverableId);
    counts.tasks += 1;
  }

  for (const item of pendingDeps) {
    const dependencyIds = item.oldDeps
      .map((id) => taskIds.get(id))
      .filter((id): id is string => Boolean(id));
    await Task.updateOne({ _id: item.destId }, { $set: { dependencyIds } });
  }

  for (const deliverableId of touchedDeliverables) {
    await recalculateProgress({ deliverableId });
  }
  for (const projectId of touchedProjects) {
    await recalculateProgress({ projectId });
  }

  if (merge) {
    return counts;
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
