import { connectDB } from "@/lib/db";
import { nextMeetingDateKey, previousMeetingDateKey, recentMeetingDateKeys } from "@/lib/meetings/cadence";
import { canonicalMeetingDate, MEETING_DATE_MOVES } from "@/lib/meetings/exceptions";
import { MeetingStatus } from "@/models/MeetingStatus";
import { Task } from "@/models/Task";

export type StatusFields = {
  actionsTaken: string[];
  nextActions: string[];
  supportDescription: string;
  status: string;
  progress: number;
};

function asId(value: unknown) {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object" && "id" in value) {
    const nested = (value as { id: unknown }).id;
    if (typeof nested === "string") return nested;
  }
  return String(value);
}

export function fieldsFromTask(task: Record<string, unknown>): StatusFields {
  const nextActions = Array.isArray(task.nextActions) ? task.nextActions.map(String) : [];
  const nextAction = task.nextAction ? [String(task.nextAction)] : [];
  return {
    actionsTaken: Array.isArray(task.actionsTaken) ? task.actionsTaken.map(String) : [],
    nextActions: nextActions.length ? nextActions : nextAction,
    supportDescription: String(task.supportDescription || task.blocker || ""),
    status: String(task.status ?? "NOT_STARTED"),
    progress: Number(task.progress ?? 0),
  };
}

export function overlayStatus(
  task: Record<string, unknown>,
  snapshot: StatusFields | null | undefined,
): Record<string, unknown> {
  if (!snapshot) return task;
  return {
    ...task,
    actionsTaken: snapshot.actionsTaken,
    nextActions: snapshot.nextActions,
    nextAction: snapshot.nextActions[0] ?? "",
    supportDescription: snapshot.supportDescription,
    blocker: snapshot.supportDescription,
    status: snapshot.status,
    progress: snapshot.progress,
  };
}

export async function snapshotsForTasks(taskIds: string[]) {
  if (taskIds.length === 0) return [];
  await connectDB();
  return MeetingStatus.find({ taskId: { $in: taskIds } }).lean() as Promise<
    Array<{
      taskId: unknown;
      meetingDate: string;
      actionsTaken?: string[];
      nextActions?: string[];
      supportDescription?: string;
      status?: string;
      progress?: number;
    }>
  >;
}

function snapshotFields(row: {
  actionsTaken?: string[];
  nextActions?: string[];
  supportDescription?: string;
  status?: string;
  progress?: number;
}): StatusFields {
  return {
    actionsTaken: (row.actionsTaken ?? []).map(String),
    nextActions: (row.nextActions ?? []).map(String),
    supportDescription: String(row.supportDescription ?? ""),
    status: String(row.status ?? "NOT_STARTED"),
    progress: Number(row.progress ?? 0),
  };
}

export function applyMeetingSnapshots(
  tasks: Array<Record<string, unknown>>,
  snapshots: Array<{
    taskId: unknown;
    meetingDate: string;
    actionsTaken?: string[];
    nextActions?: string[];
    supportDescription?: string;
    status?: string;
    progress?: number;
  }>,
  meetingDate: string,
  _workingDate?: string,
) {
  const byTask = new Map<string, typeof snapshots>();
  for (const row of snapshots) {
    const id = asId(row.taskId);
    const list = byTask.get(id) ?? [];
    list.push(row);
    byTask.set(id, list);
  }
  return tasks.map((task) => {
    const rows = (byTask.get(String(task.id)) ?? []).sort((a, b) => a.meetingDate.localeCompare(b.meetingDate));
    const exact = rows.find((row) => row.meetingDate === meetingDate);
    if (exact) return overlayStatus(task, snapshotFields(exact));

    const movedFrom = Object.entries(MEETING_DATE_MOVES).find(([, to]) => to === meetingDate)?.[0];
    const fromMoved = movedFrom ? rows.find((row) => row.meetingDate === movedFrom) : undefined;
    if (fromMoved) return overlayStatus(task, snapshotFields(fromMoved));

    const prior = [...rows].reverse().find((row) => row.meetingDate < meetingDate);
    return overlayStatus(task, prior ? snapshotFields(prior) : fieldsFromTask(task));
  });
}

export async function freezeLiveIfMissing(taskIds: string[], meetingDate?: string) {
  const working = nextMeetingDateKey();
  const dates = (meetingDate ? [meetingDate] : recentMeetingDateKeys(8)).filter((key) => key < working);
  if (!taskIds.length || dates.length === 0) return;
  await connectDB();
  const existing = await MeetingStatus.find({
    taskId: { $in: taskIds },
    meetingDate: { $in: dates },
  })
    .select("taskId meetingDate")
    .lean();
  const have = new Set(existing.map((row) => `${String(row.taskId)}:${row.meetingDate}`));
  const missingIds = [...new Set(taskIds.filter((id) => id && dates.some((date) => !have.has(`${id}:${date}`))))];
  if (missingIds.length === 0) return;
  const tasks = await Task.find({ _id: { $in: missingIds } }).lean();
  if (tasks.length === 0) return;
  const docs = tasks.flatMap((task) => {
    const fields = fieldsFromTask(task as Record<string, unknown>);
    return dates
      .filter((date) => !have.has(`${String(task._id)}:${date}`))
      .map((date) => ({
        taskId: task._id,
        meetingDate: date,
        ...fields,
      }));
  });
  if (docs.length === 0) return;
  try {
    await MeetingStatus.insertMany(docs, { ordered: false });
  } catch {
    // Unique index races are fine — the call is already frozen.
  }
}

export async function saveMeetingStatus(input: {
  taskId: string;
  meetingDate: string;
  fields: StatusFields;
  updatedBy: string;
  liveTask: {
    actionsTaken?: string[];
    nextActions?: string[];
    nextAction?: string;
    supportDescription?: string;
    blocker?: string;
    status: string;
    progress: number;
  };
  updateLive: boolean;
}) {
  await connectDB();
  const meetingDate = canonicalMeetingDate(input.meetingDate);
  if (input.updateLive) {
    const previous = previousMeetingDateKey(meetingDate);
    const existingPrev = await MeetingStatus.findOne({
      taskId: input.taskId,
      meetingDate: previous,
    });
    if (!existingPrev) {
      try {
        await MeetingStatus.create({
          taskId: input.taskId,
          meetingDate: previous,
          ...fieldsFromTask(input.liveTask as Record<string, unknown>),
          updatedBy: input.updatedBy,
        });
      } catch {
        // Another save may have already frozen this call.
      }
    }
  }

  await MeetingStatus.findOneAndUpdate(
    { taskId: input.taskId, meetingDate },
    {
      ...input.fields,
      updatedBy: input.updatedBy,
    },
    { upsert: true, new: true },
  );
}
