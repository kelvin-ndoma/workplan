import { requireUser } from "@/lib/session";
import { getUsers } from "@/lib/queries";
import { connectDB } from "@/lib/db";
import { ReminderLog } from "@/models/ReminderLog";
import { serialize } from "@/lib/serialize";
import { isLeadership } from "@/lib/permissions";
import { isEmailConfigured } from "@/lib/email";
import { PageHeader } from "@/components/work-ui";
import { SendReminderForm } from "@/components/communication/send-reminder-form";
import { formatDateTime } from "@/lib/dates";
import {
  formatMeetingDateLong,
  MEETING_TIME_LABEL,
  nextMeetingDateKey,
} from "@/lib/meetings/cadence";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function CommunicationPage() {
  const user = await requireUser();
  const leadership = isLeadership(user);
  const meeting = nextMeetingDateKey();
  const emailOn = isEmailConfigured();
  const users = (await getUsers()) as Array<{ id: string; name: string; email: string; jobTitle?: string }>;
  await connectDB();
  const logs = serialize(
    await ReminderLog.find().sort({ sentAt: -1 }).limit(12).lean(),
  ) as Array<{ id: string; kind: string; meetingDate: string; sentAt: string; recipientCount: number }>;

  return (
    <div>
      <PageHeader
        title="Communication"
        description="Remind the team by email to update their status. An automatic email also goes out one hour before each call."
        actions={
          <Button variant="outline" render={<Link href={`/my-work?meeting=${meeting}`} />}>
            Open next call status
          </Button>
        }
      />

      <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
        <p className="text-xs font-semibold tracking-wide text-amber-800 uppercase">Upcoming session</p>
        <p className="mt-1 text-lg font-semibold">{formatMeetingDateLong(meeting)}</p>
        <p className="text-sm text-amber-900/80">{MEETING_TIME_LABEL}</p>
        <p className="mt-2 text-sm text-amber-900/80">
          Automatic reminder: 2:30 PM EAT / 7:30 AM ET (one hour before the call), plus a morning note on call days.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-2xl border bg-card p-5">
          <h2 className="text-sm font-semibold tracking-wide uppercase">Remind the team</h2>
          <p className="mt-1 mb-4 text-sm text-muted-foreground">
            Sends an email and an in-app notice asking everyone to update their WorkPlan status for{" "}
            {formatMeetingDateLong(meeting)}.
          </p>
          {leadership ? (
            <SendReminderForm
              nextLabel={formatMeetingDateLong(meeting)}
              emailConfigured={emailOn}
              recipientCount={users.length}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              Mike, Will, or Kelvin can send the email reminder from here.
            </p>
          )}
        </section>

        <section className="rounded-2xl border bg-card p-5">
          <h2 className="mb-3 text-sm font-semibold tracking-wide uppercase">Team inboxes</h2>
          <div className="space-y-2">
            {users.map((person) => (
              <div key={person.id} className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm">
                <div className="min-w-0">
                  <p className="font-medium">{person.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{person.email}</p>
                </div>
                <span className="text-[11px] text-muted-foreground">{person.jobTitle}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="mt-6 rounded-2xl border bg-card p-5">
        <h2 className="mb-3 text-sm font-semibold tracking-wide uppercase">Recent reminders</h2>
        {logs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No reminders sent yet.</p>
        ) : (
          <div className="space-y-2">
            {logs.map((log) => (
              <div key={log.id} className="rounded-lg border px-3 py-2 text-sm">
                <p className="font-medium">
                  {log.kind === "UPDATE_STATUS"
                    ? "Status update email"
                    : log.kind === "CALL_HOUR_BEFORE"
                      ? "1 hour before call"
                      : log.kind === "CALL_DAY_OF"
                        ? "Call-day reminder"
                        : "Day-before reminder"}{" "}
                  · {log.meetingDate}
                </p>
                <p className="text-xs text-muted-foreground">
                  {log.recipientCount} people · {formatDateTime(log.sentAt)}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
