import { connectDB } from "@/lib/db";
import { serialize } from "@/lib/serialize";
import { summarizeTasks } from "@/lib/queries";
import { Activity, Decision, Meeting, Project, SupportRequest, Task } from "@/models";
import type { SlideType } from "@/types";

export type Slide = {
  type: SlideType;
  userId?: string;
  label: string;
  section: string;
};

export function buildSlides(
  participants: Array<{ id: string; name: string }>,
): Slide[] {
  const slides: Slide[] = [
    { type: "overview", label: "Team Overview", section: "overview" },
  ];
  for (const person of participants) {
    const first = person.name.split(" ")[0];
    slides.push(
      { type: "member-overview", userId: person.id, label: first, section: person.id },
      { type: "member-brief", userId: person.id, label: `${first} · Brief-out`, section: person.id },
      { type: "member-completed", userId: person.id, label: `${first} · Completed`, section: person.id },
      { type: "member-progress", userId: person.id, label: `${first} · In Progress`, section: person.id },
      { type: "member-next", userId: person.id, label: `${first} · Next`, section: person.id },
      { type: "member-support", userId: person.id, label: `${first} · Support`, section: person.id },
    );
  }
  slides.push(
    { type: "decisions", label: "Decisions", section: "decisions" },
    { type: "action-items", label: "Action Items", section: "actions" },
    { type: "summary", label: "Summary", section: "summary" },
  );
  return slides;
}

export async function getPresentationData(meetingId: string) {
  await connectDB();
  const meeting = await Meeting.findById(meetingId)
    .populate("participantIds", "name email avatar jobTitle role")
    .populate("hostId", "name avatar")
    .populate("projectIds", "name color progress status")
    .lean();
  if (!meeting) return null;

  const participantIds = (meeting.participantIds as Array<{ _id: unknown }>).map((p) => p._id);
  const month = meeting.workPlanMonth as string;

  const previous = await Meeting.findOne({
    _id: { $ne: meeting._id },
    status: "COMPLETED",
    date: { $lt: meeting.date },
  })
    .sort({ date: -1 })
    .lean();

  const since = previous?.date ?? new Date(0);

  const [tasks, projects, support, decisions, actionTasks, recentActivities] =
    await Promise.all([
      Task.find({
        workPlanMonth: month,
        assignedTo: { $in: participantIds },
      })
        .populate("projectId", "name color")
        .populate("deliverableId", "name")
        .populate("assignedTo", "name")
        .lean(),
      Project.find({ _id: { $in: meeting.projectIds } }).lean(),
      SupportRequest.find({
        requestedBy: { $in: participantIds },
        status: { $ne: "RESOLVED" },
      })
        .populate("taskId", "title projectId assignedTo")
        .populate("requestedBy", "name")
        .lean(),
      Decision.find({ meetingId }).populate("ownerId", "name").lean(),
      Task.find({ meetingId }).populate("assignedTo", "name").populate("projectId", "name").lean(),
      Activity.find({
        createdAt: { $gte: since },
        userId: { $in: participantIds },
      })
        .sort({ createdAt: -1 })
        .populate("taskId", "title assignedTo")
        .lean(),
    ]);

  const serializedTasks = serialize(tasks) as Array<Record<string, unknown>>;
  const members = (meeting.participantIds as Array<Record<string, unknown>>).map((person) => {
    const id = String(person._id ?? person.id);
    const memberTasks = serializedTasks.filter((task) => {
      const assigned = task.assignedTo as { id?: string } | string | undefined;
      return String(typeof assigned === "object" ? assigned?.id : assigned) === id;
    });
    const completedSince = memberTasks.filter((task) => {
      if (task.status !== "COMPLETED") return false;
      const completedAt = task.completedAt ? new Date(String(task.completedAt)) : null;
      return !completedAt || completedAt >= new Date(since);
    });
    const completedFromActivity = (serialize(recentActivities) as Array<Record<string, unknown>>)
      .filter((activity) => {
        const uid = String((activity.userId as { id?: string })?.id ?? activity.userId);
        return (
          uid === id &&
          (activity.type === "ACTION_COMPLETED" || activity.type === "PROGRESS_UPDATE")
        );
      })
      .map((activity) => String(activity.message));

    return {
      user: serialize(person),
      tasks: memberTasks,
      summary: summarizeTasks(memberTasks),
      completed: completedSince,
      completedItems: [
        ...completedSince.flatMap((task) =>
          ((task.actionsTaken as string[]) ?? []).length
            ? (task.actionsTaken as string[])
            : [String(task.title)],
        ),
        ...completedFromActivity,
      ].filter((item, index, arr) => arr.indexOf(item) === index),
      inProgress: memberTasks.filter((task) =>
        ["IN_PROGRESS", "AT_RISK", "BLOCKED"].includes(String(task.status)),
      ),
      nextActions: memberTasks.flatMap((task) => {
        const extras = (task.nextActions as string[]) ?? [];
        if (extras.length) return extras;
        return task.nextAction ? [String(task.nextAction)] : [];
      }),
      support: memberTasks.filter(
        (task) => task.supportNeeded || task.blocker || task.status === "BLOCKED",
      ),
      talkingPoints: memberTasks.flatMap((task) => (task.talkingPoints as string[]) ?? []),
    };
  });

  const slides = buildSlides(
    members.map((member) => ({
      id: String((member.user as { id: string }).id),
      name: String((member.user as { name: string }).name),
    })),
  );

  return serialize({
    meeting,
    previousMeeting: previous,
    projects,
    tasks: serializedTasks,
    support,
    decisions,
    actionTasks,
    members,
    slides,
    summary: summarizeTasks(serializedTasks),
    since,
  });
}
