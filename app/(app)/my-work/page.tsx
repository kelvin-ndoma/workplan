import Link from "next/link";
import { requireUser } from "@/lib/session";
import { getMonthFocus, getMyWorkData, resolveStatusMonth } from "@/lib/queries";
import { canAssignWork } from "@/lib/permissions";
import { PageHeader, ProgressBar, StatCard } from "@/components/work-ui";
import { MeetingLinkBar } from "@/components/layout/topbar";
import { StatusTable } from "@/components/status/status-table";
import { Button } from "@/components/ui/button";
import {
  formatMeetingDateLong,
  isEditableMeetingDate,
  MEETING_TIME_LABEL,
  resolveMeetingDateKey,
} from "@/lib/meetings/cadence";

export default async function MyWorkPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; meeting?: string }>;
}) {
  const user = await requireUser();
  const { month: monthParam, meeting: meetingParam } = await searchParams;
  const meeting = resolveMeetingDateKey(meetingParam);
  const month = await resolveStatusMonth(meeting, monthParam);
  const [data, focus] = await Promise.all([getMyWorkData(user.id, month, meeting), getMonthFocus(month)]);
  const summary = data.summary as {
    progress: number;
    total: number;
    completed: number;
    inProgress: number;
    atRisk: number;
    blocked: number;
  };
  const canEdit = isEditableMeetingDate(meeting);

  return (
    <div>
      <PageHeader
        title="My status"
        description={
          canEdit
            ? `Updates save to ${formatMeetingDateLong(meeting)} at ${MEETING_TIME_LABEL}.`
            : "This call is over. You can view it, but you can’t edit past calls."
        }
        actions={
          <>
            <Button variant="outline" render={<Link href={`/brief?meeting=${meeting}`} />}>
              Share screen
            </Button>
            {canAssignWork(user) ? (
              <Button render={<Link href="/tasks/new" />}>Assign a piece</Button>
            ) : null}
          </>
        }
      />
      <div className="mb-6">
        <MeetingLinkBar meeting={meeting} pathname="/my-work" />
      </div>
      {(focus as { summary?: string } | null)?.summary ? (
        <div className="mb-6 rounded-xl border bg-card px-5 py-4">
          <p className="text-xs font-medium text-muted-foreground">This month’s focus</p>
          <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{String((focus as { summary: string }).summary)}</p>
        </div>
      ) : null}
      <div className="mb-6 grid gap-3 sm:grid-cols-4">
        <StatCard label="Progress" value={`${summary.progress}%`} />
        <StatCard label="In progress" value={summary.inProgress} tone="info" />
        <StatCard label="Blocked" value={summary.blocked} tone="danger" />
        <StatCard label="At risk" value={summary.atRisk} tone="warning" />
      </div>
      <div className="mb-6 flex items-center gap-3 rounded-xl border bg-card px-4 py-3">
        <ProgressBar value={summary.progress} className="h-2 flex-1" />
        <span className="text-sm font-semibold tabular-nums">{summary.progress}%</span>
      </div>
      <StatusTable tasks={data.tasks as never} editable={canEdit} meetingDate={meeting} />
    </div>
  );
}
