import { addDays, startOfDay } from "date-fns";
import { connectDB } from "@/lib/db";
import { serialize } from "@/lib/serialize";
import { isOverdue } from "@/lib/dates";
import { weightedProgress } from "@/lib/progress";
import {
  Activity,
  Comment,
  Decision,
  Deliverable,
  Department,
  Meeting,
  MonthFocus,
  Notification,
  Project,
  SupportRequest,
  Task,
  User,
} from "@/models";
import { sortByBriefingOrder } from "@/lib/briefing";
import { isLeadership } from "@/lib/permissions";
import { needsActivationInvite } from "@/lib/invite";
import type { SessionUser } from "@/types";
import { applyMeetingSnapshots, freezeLiveIfMissing, snapshotsForTasks } from "@/lib/meeting-status";
import {
  monthFromMeeting,
  nairobiDateKey,
  nextMeetingDateKey,
} from "@/lib/meetings/cadence";

const taskPopulate = [
  { path: "assignedTo", select: "name email avatar jobTitle role" },
  { path: "createdBy", select: "name email avatar" },
  { path: "projectId", select: "name color status progress" },
  { path: "deliverableId", select: "name progress status" },
];

export async function getUsers() {
  await connectDB();
  return serialize<Array<Record<string, unknown>>>(
    await User.find({ isActive: true })
      .select("name email role avatar jobTitle departmentId managerId isActive invitePending passwordResetExpires")
      .sort({ name: 1 })
      .lean(),
  );
}

export async function getAdminTeam() {
  await connectDB();
  const rows = await User.find({ isActive: true })
    .select("name email role avatar jobTitle invitePending passwordResetExpires passwordHash")
    .sort({ name: 1 })
    .lean();

  const team = [];
  for (const row of rows) {
    const needsInvite = await needsActivationInvite(row);
    team.push({
      id: String(row._id),
      name: String(row.name),
      email: String(row.email),
      role: row.role,
      jobTitle: row.jobTitle ? String(row.jobTitle) : undefined,
      invitePending: Boolean(row.invitePending),
      passwordResetExpires: row.passwordResetExpires ? new Date(row.passwordResetExpires).toISOString() : undefined,
      needsInvite,
    });
  }
  return team;
}

export async function getProjectsForUser(user: SessionUser) {
  await connectDB();
  const filter =
    user.role === "TEAM_MEMBER"
      ? { memberIds: user.id, status: { $ne: "ARCHIVED" } }
      : { status: { $ne: "ARCHIVED" } };
  return serialize(await Project.find(filter).sort({ name: 1 }).lean());
}

export async function getTaskById(id: string) {
  await connectDB();
  const task = await Task.findById(id).populate(taskPopulate).lean();
  if (!task) return null;
  const [activities, comments, support] = await Promise.all([
    Activity.find({ taskId: id }).sort({ createdAt: -1 }).populate("userId", "name avatar").lean(),
    Comment.find({ targetType: "TASK", targetId: id })
      .sort({ createdAt: -1 })
      .populate("userId", "name avatar")
      .lean(),
    SupportRequest.find({ taskId: id }).sort({ createdAt: -1 }).lean(),
  ]);
  return serialize({ task, activities, comments, support });
}

export async function resolveStatusMonth(meeting: string, monthParam?: string) {
  await connectDB();
  const meetingMonth = monthFromMeeting(meeting);
  const currentMonth = monthFromMeeting(nairobiDateKey());

  async function monthHasTasks(month: string) {
    return Boolean(await Task.exists({ workPlanMonth: month }));
  }

  if (monthParam && (await monthHasTasks(monthParam))) return monthParam;
  if (await monthHasTasks(meetingMonth)) return meetingMonth;

  const prior = await Task.findOne({ workPlanMonth: { $lte: meetingMonth } })
    .sort({ workPlanMonth: -1 })
    .select("workPlanMonth")
    .lean();
  if (prior && typeof prior === "object" && "workPlanMonth" in prior && prior.workPlanMonth) {
    return String(prior.workPlanMonth);
  }

  if (await monthHasTasks(currentMonth)) return currentMonth;

  const latest = await Task.findOne({}).sort({ workPlanMonth: -1 }).select("workPlanMonth").lean();
  if (latest && typeof latest === "object" && "workPlanMonth" in latest && latest.workPlanMonth) {
    return String(latest.workPlanMonth);
  }
  return monthParam || meetingMonth;
}

export async function getMonthTasks(options: {
  month: string;
  userId?: string;
  projectId?: string;
}) {
  await connectDB();
  const filter: Record<string, unknown> = { workPlanMonth: options.month };
  if (options.userId) filter.assignedTo = options.userId;
  if (options.projectId) filter.projectId = options.projectId;
  return serialize(await Task.find(filter).populate(taskPopulate).sort({ dueDate: 1 }).lean());
}

export function summarizeTasks(tasks: Array<Record<string, unknown>>) {
  const list = tasks ?? [];
  const active = list.filter((task) => task.status !== "CANCELLED");
  const progress = weightedProgress(
    active.map((task) => ({
      progress: Number(task.progress ?? 0),
      weight: Number(task.weight ?? 1),
      status: String(task.status ?? ""),
    })),
  );
  const overdue = list.filter((task) =>
    isOverdue(task.dueDate as string | Date | null, String(task.status)),
  );
  return {
    total: list.length,
    progress,
    completed: list.filter((task) => task.status === "COMPLETED").length,
    inProgress: list.filter((task) => task.status === "IN_PROGRESS").length,
    atRisk: list.filter((task) => task.status === "AT_RISK").length,
    blocked: list.filter((task) => task.status === "BLOCKED").length,
    overdue: overdue.length,
    notStarted: list.filter((task) => task.status === "NOT_STARTED").length,
  };
}

export async function getMyWorkData(userId: string, month: string, meetingDate?: string) {
  await connectDB();
  const working = nextMeetingDateKey();
  const meeting = meetingDate || working;
  const resolvedMonth = meetingDate ? await resolveStatusMonth(meeting, month) : month;
  const tasks = (await getMonthTasks({ month: resolvedMonth, userId })) as Array<Record<string, unknown>>;
  const today = startOfDay(new Date());
  const weekEnd = addDays(today, 7);
  const ids = tasks.map((task) => task.id);

  const [activities, support] = await Promise.all([
    Activity.find({ taskId: { $in: ids } })
      .sort({ createdAt: -1 })
      .limit(12)
      .populate("userId", "name avatar")
      .populate("taskId", "title")
      .lean(),
    SupportRequest.find({
      $or: [{ requestedBy: userId }, { taskId: { $in: ids } }],
      status: { $ne: "RESOLVED" },
    })
      .populate("taskId", "title")
      .lean(),
  ]);

  const dueToday = tasks.filter((task) => {
    if (!task.dueDate) return false;
    const due = startOfDay(new Date(String(task.dueDate)));
    return due.getTime() === today.getTime() && task.status !== "COMPLETED";
  });
  const dueThisWeek = tasks.filter((task) => {
    if (!task.dueDate) return false;
    const due = new Date(String(task.dueDate));
    return due >= today && due <= weekEnd && task.status !== "COMPLETED";
  });
  const needsAttention = tasks.filter(
    (task) =>
      task.status === "BLOCKED" ||
      task.status === "AT_RISK" ||
      isOverdue(task.dueDate as string, String(task.status)),
  );
  const nextActions = tasks.filter(
    (task) => task.status !== "COMPLETED" && task.status !== "CANCELLED" && task.nextAction,
  );
  const taskIds = ids.map(String);
  await freezeLiveIfMissing(taskIds);
  const snapshots = await snapshotsForTasks(taskIds);
  const meetingTasks = applyMeetingSnapshots(tasks, snapshots, meeting, working);
  const savedForMeeting = snapshots.some((row) => row.meetingDate === meeting);

  return serialize({
    tasks: meetingTasks,
    summary: summarizeTasks(meetingTasks),
    dueToday,
    dueThisWeek,
    needsAttention,
    nextActions,
    activities,
    support,
    month: resolvedMonth,
    meetingDate: meeting,
    savedForMeeting,
  });
}

export async function getTeamDashboard(month: string, meetingDate?: string) {
  await connectDB();
  const working = nextMeetingDateKey();
  const meeting = meetingDate || working;
  const resolvedMonth = meetingDate ? await resolveStatusMonth(meeting, month) : month;
  const users = await User.find({ isActive: true }).sort({ name: 1 }).lean();
  const tasks = (await getMonthTasks({ month: resolvedMonth })) as Array<Record<string, unknown>>;
  const taskIds = tasks.map((task) => String(task.id));
  await freezeLiveIfMissing(taskIds);
  const snapshots = await snapshotsForTasks(taskIds);
  const meetingTasks = applyMeetingSnapshots(tasks, snapshots, meeting, working);
  const savedForMeeting = snapshots.some((row) => row.meetingDate === meeting);
  const members = sortByBriefingOrder(
    users.map((user) => {
      const memberTasks = meetingTasks.filter((task) => {
        const assigned = task.assignedTo as { id?: string } | string | undefined;
        const assignedId =
          assigned && typeof assigned === "object" ? String(assigned.id ?? "") : String(assigned ?? "");
        return assignedId === String(user._id);
      });
      return {
        user: serialize(user),
        summary: summarizeTasks(memberTasks),
        tasks: memberTasks,
      };
    }),
    (member) => (member.user as { name?: string }).name,
  );
  return {
    month: resolvedMonth,
    meetingDate: meeting,
    members,
    summary: summarizeTasks(meetingTasks),
    savedForMeeting,
  };
}

export async function getMonthFocus(month: string) {
  await connectDB();
  return serialize(await MonthFocus.findOne({ month }).populate("setBy", "name").lean());
}

export async function getLeadershipData(month: string) {
  await connectDB();
  const [projects, tasks, support, meetings] = await Promise.all([
    Project.find({ status: { $ne: "ARCHIVED" } }).lean(),
    getMonthTasks({ month }),
    SupportRequest.find({ status: { $ne: "RESOLVED" } })
      .populate("taskId", "title projectId")
      .populate("requestedBy", "name avatar")
      .lean(),
    Meeting.find({ workPlanMonth: month }).sort({ date: -1 }).lean(),
  ]);
  const typedTasks = tasks as Array<Record<string, unknown>>;
  const upcoming = typedTasks
    .filter((task) => task.dueDate && task.status !== "COMPLETED" && task.status !== "CANCELLED")
    .sort((a, b) => String(a.dueDate).localeCompare(String(b.dueDate)))
    .slice(0, 8);

  return serialize({
    projects,
    tasks: typedTasks,
    support,
    meetings,
    summary: summarizeTasks(typedTasks),
    upcoming,
    blocked: typedTasks.filter((task) => task.status === "BLOCKED"),
    atRisk: typedTasks.filter((task) => task.status === "AT_RISK"),
  });
}

export async function getProjectDetail(id: string) {
  await connectDB();
  const project = await Project.findById(id)
    .populate("ownerId", "name avatar jobTitle")
    .populate("memberIds", "name avatar jobTitle")
    .lean();
  if (!project) return null;
  const [deliverables, tasks, activities] = await Promise.all([
    Deliverable.find({ projectId: id }).sort({ name: 1 }).lean(),
    Task.find({ projectId: id }).populate(taskPopulate).sort({ dueDate: 1 }).lean(),
    Activity.find({
      taskId: { $in: await Task.find({ projectId: id }).distinct("_id") },
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate("userId", "name avatar")
      .populate("taskId", "title")
      .lean(),
  ]);
  return serialize({
    project,
    deliverables,
    tasks,
    activities,
    summary: summarizeTasks(serialize(tasks) as Array<Record<string, unknown>>),
  });
}

export async function getCalendarItems(start: Date, end: Date) {
  await connectDB();
  const [tasks, meetings] = await Promise.all([
    Task.find({
      dueDate: { $gte: start, $lte: end },
      status: { $nin: ["CANCELLED"] },
    })
      .populate("assignedTo", "name")
      .populate("projectId", "name color")
      .lean(),
    Meeting.find({ date: { $gte: start, $lte: end } }).lean(),
  ]);
  return serialize({ tasks, meetings });
}

export async function getNotifications(userId: string) {
  await connectDB();
  return serialize(
    await Notification.find({ userId }).sort({ createdAt: -1 }).limit(40).lean(),
  );
}

export async function getUnreadCount(userId: string) {
  await connectDB();
  return Notification.countDocuments({ userId, read: false });
}

export async function searchAll(query: string) {
  await connectDB();
  const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  const [users, projects, deliverables, tasks, meetings] = await Promise.all([
    User.find({ isActive: true, name: regex }).select("name email jobTitle role").limit(6).lean(),
    Project.find({ name: regex }).select("name status color").limit(6).lean(),
    Deliverable.find({ name: regex }).select("name projectId").limit(6).lean(),
    Task.find({ title: regex }).select("title status progress").limit(8).lean(),
    Meeting.find({ title: regex }).select("title date status").limit(6).lean(),
  ]);
  return serialize({ users, projects, deliverables, tasks, meetings });
}

export async function getDepartments() {
  await connectDB();
  return serialize(
    await Department.find()
      .populate("managerId", "name")
      .populate("memberIds", "name avatar")
      .lean(),
  );
}

export async function getNextMeeting(user: Pick<SessionUser, "id" | "role">) {
  await connectDB();
  const filter: Record<string, unknown> = {};
  if (!isLeadership(user)) filter.participantIds = user.id;

  const live = await Meeting.findOne({ ...filter, status: "LIVE" })
    .populate("hostId", "name avatar")
    .lean();
  if (live) return serialize(live);

  return serialize(
    await Meeting.findOne({
      ...filter,
      status: "SCHEDULED",
      date: { $gte: startOfDay(new Date()) },
    })
      .sort({ date: 1 })
      .populate("hostId", "name avatar")
      .lean(),
  );
}

export async function getMeetingsOverview(user: Pick<SessionUser, "id" | "role">) {
  await connectDB();
  const filter = isLeadership(user) ? {} : { participantIds: user.id };
  const meetings = serialize(
    await Meeting.find(filter).sort({ date: -1 }).populate("hostId", "name avatar").lean(),
  ) as Array<Record<string, unknown>>;

  const today = startOfDay(new Date());
  const live = meetings.filter((meeting) => meeting.status === "LIVE");
  const upcoming = meetings
    .filter((meeting) => {
      const status = String(meeting.status);
      if (status === "COMPLETED" || status === "CANCELLED" || status === "LIVE") return false;
      return startOfDay(new Date(String(meeting.date))) >= today;
    })
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const past = meetings.filter((meeting) => {
    const status = String(meeting.status);
    if (status === "LIVE") return false;
    return status === "COMPLETED" || status === "CANCELLED" || startOfDay(new Date(String(meeting.date))) < today;
  });

  return {
    meetings,
    live,
    upcoming,
    past,
    next: live[0] ?? upcoming[0] ?? null,
  };
}

export async function getMeetingBundle(id: string) {
  await connectDB();
  const meeting = await Meeting.findById(id)
    .populate("participantIds", "name email avatar jobTitle role")
    .populate("hostId", "name avatar")
    .populate("projectIds", "name color progress status")
    .lean();
  if (!meeting) return null;
  const [decisions, comments, actionTasks] = await Promise.all([
    Decision.find({ meetingId: id }).populate("ownerId", "name").lean(),
    Comment.find({ targetType: "MEETING", targetId: id })
      .populate("userId", "name avatar")
      .sort({ createdAt: -1 })
      .lean(),
    Task.find({ meetingId: id }).populate("assignedTo", "name").lean(),
  ]);
  return serialize({ meeting, decisions, comments, actionTasks });
}
