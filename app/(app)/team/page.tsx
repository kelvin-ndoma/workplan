import Link from "next/link";
import { requireUser } from "@/lib/session";
import { getTeamDashboard } from "@/lib/queries";
import { PageHeader, ProgressBar, StatCard, UserAvatar } from "@/components/work-ui";
import { MeetingLinkBar } from "@/components/layout/topbar";
import { Button } from "@/components/ui/button";
import {
  formatMeetingDateLong,
  MEETING_TIME_LABEL,
  monthFromMeeting,
  nextMeetingDateKey,
  resolveMeetingDateKey,
} from "@/lib/meetings/cadence";

export default async function TeamPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; meeting?: string }>;
}) {
  await requireUser();
  const { month: monthParam, meeting: meetingParam } = await searchParams;
  const meeting = resolveMeetingDateKey(meetingParam);
  const working = nextMeetingDateKey();
  const month = monthParam || monthFromMeeting(meeting);
  const data = await getTeamDashboard(month, meeting);
  const isWorking = meeting === working;

  return (
    <div>
      <PageHeader
        title="Team"
        description={
          isWorking
            ? `Next call ${formatMeetingDateLong(meeting)} · ${MEETING_TIME_LABEL}. One person shares the Share screen tab.`
            : `Status from the ${formatMeetingDateLong(meeting)} call.`
        }
        actions={
          <Button render={<Link href={`/brief?meeting=${meeting}`} />}>Share this in Teams</Button>
        }
      />
      <div className="mb-6">
        <MeetingLinkBar meeting={meeting} pathname="/team" />
      </div>
      <div className="mb-6 grid gap-3 sm:grid-cols-4">
        <StatCard label="Team progress" value={`${data.summary.progress}%`} />
        <StatCard label="Completed" value={data.summary.completed} tone="success" />
        <StatCard label="Blocked" value={data.summary.blocked} tone="danger" />
        <StatCard label="At risk" value={data.summary.atRisk} tone="warning" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {data.members.map((member, index) => {
          const person = member.user as { id: string; name: string; jobTitle?: string; avatar?: string };
          return (
            <Link
              key={person.id}
              href={`/team/${person.id}?meeting=${meeting}`}
              className="rounded-xl border bg-card p-5 transition-colors hover:border-primary/25"
            >
              <p className="mb-3 text-[11px] font-medium text-muted-foreground">
                {index + 1}. Brief-out order
              </p>
              <div className="flex items-center gap-3">
                <UserAvatar name={person.name} src={person.avatar} />
                <div className="min-w-0">
                  <p className="truncate font-semibold">{person.name.split(" ")[0]}</p>
                  <p className="truncate text-xs text-muted-foreground">{person.jobTitle}</p>
                </div>
                <p className="ml-auto text-2xl font-semibold tabular-nums">{member.summary.progress}%</p>
              </div>
              <ProgressBar value={member.summary.progress} className="mt-4" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
