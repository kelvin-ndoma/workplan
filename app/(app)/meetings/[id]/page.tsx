import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { getMeetingBundle } from "@/lib/queries";
import { isLeadership } from "@/lib/permissions";
import { formatMeetingWhen, meetingDayName, toDate } from "@/lib/meetings/cadence";
import { PageHeader, StatCard, StatusBadge } from "@/components/work-ui";
import { Button } from "@/components/ui/button";
import { MeetingNotesForm } from "@/components/meetings/forms";
import { CommentThread } from "@/components/comments";
import { connectDB } from "@/lib/db";
import { SupportRequest, Task } from "@/models";

export default async function MeetingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const data = await getMeetingBundle(id);
  if (!data) notFound();
  const meeting = data.meeting as Record<string, unknown>;
  await connectDB();
  const [openSupport, completed] = await Promise.all([
    SupportRequest.countDocuments({ status: { $ne: "RESOLVED" } }),
    Task.countDocuments({ workPlanMonth: meeting.workPlanMonth, status: "COMPLETED" }),
  ]);

  const ended = meeting.status === "COMPLETED";
  const live = meeting.status === "LIVE";
  const day = toDate(meeting.date as string);

  return (
    <div>
      <PageHeader
        title={String(meeting.title)}
        description={`${formatMeetingWhen(meeting.date as string, meeting.startTime as string, meeting.endTime as string)} · Host ${(meeting.hostId as { name?: string })?.name}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-teal-50 px-2 py-0.5 text-[11px] font-semibold tracking-wide text-teal-800 uppercase">
              {meetingDayName(day)}
            </span>
            <StatusBadge value={String(meeting.status)} />
            <Button render={<Link href={`/meetings/${id}/present`} />}>
              {live ? "Join live" : "Join presentation"}
            </Button>
            {isLeadership(user) ? (
              <Button variant="outline" render={<Link href={`/meetings/${id}/present?mode=host`} />}>
                Host
              </Button>
            ) : (
              <Button variant="outline" render={<Link href={`/meetings/${id}/present?mode=presenter`} />}>
                Presenter notes
              </Button>
            )}
          </div>
        }
      />
      {ended ? (
        <div className="mb-6 rounded-xl border bg-card p-5">
          <h2 className="font-semibold">After the meeting</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {Number(meeting.durationMinutes ?? 0)} minutes · {(meeting.participantIds as unknown[])?.length ?? 0} people
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-4">
            <StatCard label="Completed tasks" value={completed} />
            <StatCard label="Decisions" value={(data.decisions as unknown[]).length} />
            <StatCard label="Action items" value={(data.actionTasks as unknown[]).length} />
            <StatCard label="Open blockers" value={openSupport} tone="danger" />
          </div>
          {meeting.summary ? <p className="mt-4 text-sm leading-relaxed">{String(meeting.summary)}</p> : null}
        </div>
      ) : null}
      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-xl border bg-card p-5">
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">Agenda</h2>
          <ol className="list-decimal space-y-1.5 pl-5 text-sm leading-relaxed">
            {((meeting.agenda as string[]) ?? []).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>
          <h2 className="mt-6 mb-3 text-sm font-medium text-muted-foreground">Decisions</h2>
          {(data.decisions as Array<Record<string, unknown>>).length === 0 ? (
            <p className="text-sm text-muted-foreground">Decisions captured in the meeting will show here.</p>
          ) : (
            (data.decisions as Array<Record<string, unknown>>).map((item) => (
              <div key={String(item.id)} className="mb-3 rounded-xl border p-3">
                <p className="font-medium">{String(item.title)}</p>
                <p className="text-sm text-muted-foreground">{String(item.decision)}</p>
              </div>
            ))
          )}
          <h2 className="mt-6 mb-3 text-sm font-medium text-muted-foreground">Action items</h2>
          {(data.actionTasks as Array<Record<string, unknown>>).length === 0 ? (
            <p className="text-sm text-muted-foreground">Action items from this meeting will show here.</p>
          ) : (
            (data.actionTasks as Array<Record<string, unknown>>).map((item) => (
              <Link key={String(item.id)} href={`/tasks/${item.id}`} className="mb-2 block rounded-xl border p-3 text-sm hover:border-primary/30">
                {String(item.title)}
              </Link>
            ))
          )}
        </section>
        <section className="rounded-xl border bg-card p-5">
          {isLeadership(user) ? (
            <MeetingNotesForm id={id} notes={String(meeting.notes ?? "")} summary={String(meeting.summary ?? "")} />
          ) : (
            <p className="text-sm leading-relaxed text-muted-foreground">
              {String(meeting.notes || "Notes will appear after the host saves them.")}
            </p>
          )}
          <div className="mt-6">
            <h2 className="mb-3 text-sm font-medium text-muted-foreground">Discussion</h2>
            <CommentThread targetType="MEETING" targetId={id} comments={data.comments as never} />
          </div>
        </section>
      </div>
    </div>
  );
}
