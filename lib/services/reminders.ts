import { format } from "date-fns";
import { connectDB } from "@/lib/db";
import { formatMonthLabel } from "@/lib/dates";
import {
  dateInputValue,
  formatMeetingDateLong,
  meetingDayName,
  MEETING_TIME_LABEL,
  nextMeetingDate,
  nextMeetingDateKey,
  reminderWindow,
} from "@/lib/meetings/cadence";
import {
  appUrl,
  assignmentEmail,
  callReminderEmail,
  firstNameFrom,
  isEmailConfigured,
  sendEmail,
} from "@/lib/email";
import { notify, writeAudit } from "@/lib/services/events";
import { ReminderLog, User } from "@/models";

export async function sendAssignmentEmail(input: {
  assigneeId: string;
  assignerName: string;
  title: string;
  month: string;
  taskId: string;
}) {
  await connectDB();
  const assignee = await User.findById(input.assigneeId).lean();
  if (!assignee?.email) return { skipped: true as const };
  const origin = appUrl();
  const mail = assignmentEmail({
    assigneeName: firstNameFrom(assignee.name, assignee.email),
    assignerName: input.assignerName,
    title: input.title,
    monthLabel: formatMonthLabel(input.month),
    taskUrl: `${origin}/tasks/${input.taskId}`,
    statusUrl: `${origin}/my-work`,
  });
  return sendEmail({ to: String(assignee.email), toName: String(assignee.name), ...mail });
}

export async function sendCallReminders(options?: { force?: boolean; actorId?: string }) {
  await connectDB();
  const window = reminderWindow();
  const next = nextMeetingDate();
  const kind = window?.kind ?? "CALL_DAY_BEFORE";
  const meetingDate = dateInputValue(window?.date ?? next);

  if (!options?.force) {
    const existing = await ReminderLog.findOne({ kind, meetingDate });
    if (existing) {
      return { skipped: true as const, reason: "already-sent", meetingDate, kind };
    }
  }

  const people = await User.find({ isActive: true }).lean();
  const origin = appUrl();
  const dayName = meetingDayName(window?.date ?? next);
  const dateLabel = format(window?.date ?? next, "MMM d");
  let sent = 0;

  for (const person of people) {
    await notify({
      userId: String(person._id),
      type: kind,
      title:
        kind === "CALL_HOUR_BEFORE"
          ? `Call in 1 hour — update your status`
          : kind === "CALL_DAY_OF"
            ? `Today’s ${dayName} call`
            : `${dayName} call tomorrow`,
      message:
        kind === "CALL_HOUR_BEFORE"
          ? `Remember to update your status. The call starts in about an hour at ${MEETING_TIME_LABEL}.`
          : kind === "CALL_DAY_BEFORE"
            ? `The ${dayName} call is tomorrow at ${MEETING_TIME_LABEL}. Remember to update your status.`
            : `Remember to update your status before we meet at ${MEETING_TIME_LABEL}.`,
      link: `/my-work?meeting=${meetingDate}`,
    });
    if (person.email) {
      const mail = callReminderEmail({
        name: firstNameFrom(person.name, person.email),
        dayName,
        dateLabel,
        kind,
        statusUrl: `${origin}/my-work?meeting=${meetingDate}`,
        shareUrl: `${origin}/brief?meeting=${meetingDate}`,
      });
      const result = await sendEmail({
        to: String(person.email),
        toName: String(person.name),
        ...mail,
      });
      if ("sent" in result && result.sent) sent += 1;
    }
  }

  await ReminderLog.findOneAndUpdate(
    { kind, meetingDate },
    { sentAt: new Date(), recipientCount: people.length },
    { upsert: true },
  );
  if (options?.actorId) {
    await writeAudit({
      actorId: options.actorId,
      action: "CALL_REMINDER_SENT",
      entityType: "ReminderLog",
      entityId: meetingDate,
      details: { kind, count: people.length, emailed: sent },
    });
  }

  return {
    ok: true as const,
    kind,
    meetingDate,
    notified: people.length,
    emailed: sent,
    emailConfigured: isEmailConfigured(),
  };
}

export async function sendUpdateStatusReminders(options: {
  actorId: string;
  actorName: string;
  note?: string;
}) {
  await connectDB();
  const meetingDate = nextMeetingDateKey();
  const next = nextMeetingDate();
  const people = await User.find({ isActive: true }).lean();
  const origin = appUrl();
  const dayName = meetingDayName(next);
  const dateLabel = format(next, "MMM d");
  const note = options.note?.trim() || undefined;
  let sent = 0;
  let failed = 0;

  for (const person of people) {
    await notify({
      userId: String(person._id),
      type: "UPDATE_STATUS",
      title: `Remember to update your status for ${formatMeetingDateLong(meetingDate)}`,
      message: `Next call is ${dayName}, ${dateLabel} at ${MEETING_TIME_LABEL}. Save your update so Share screen is current.`,
      link: `/my-work?meeting=${meetingDate}`,
    });
    if (person.email) {
      const mail = callReminderEmail({
        name: firstNameFrom(person.name, person.email),
        dayName,
        dateLabel,
        kind: "UPDATE_STATUS",
        statusUrl: `${origin}/my-work?meeting=${meetingDate}`,
        shareUrl: `${origin}/brief?meeting=${meetingDate}`,
        note,
        senderName: firstNameFrom(options.actorName),
      });
      const result = await sendEmail({
        to: String(person.email),
        toName: String(person.name),
        ...mail,
      });
      if ("sent" in result && result.sent) sent += 1;
      else if ("error" in result) failed += 1;
    }
  }

  await ReminderLog.findOneAndUpdate(
    { kind: "UPDATE_STATUS", meetingDate },
    { sentAt: new Date(), recipientCount: people.length },
    { upsert: true },
  );
  await writeAudit({
    actorId: options.actorId,
    action: "STATUS_REMINDER_EMAILED",
    entityType: "ReminderLog",
    entityId: meetingDate,
    details: { meetingDate, notified: people.length, emailed: sent, failed, note: Boolean(note) },
  });

  return {
    ok: true as const,
    kind: "UPDATE_STATUS" as const,
    meetingDate,
    notified: people.length,
    emailed: sent,
    failed,
    emailConfigured: isEmailConfigured(),
  };
}
