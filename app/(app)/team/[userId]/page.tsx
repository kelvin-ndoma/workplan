import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { serialize } from "@/lib/serialize";
import { getMyWorkData } from "@/lib/queries";
import { EmptyState, PageHeader, ProgressBar, StatCard } from "@/components/work-ui";
import { MeetingLinkBar } from "@/components/layout/topbar";
import { StatusTable } from "@/components/status/status-table";
import { isLeadership } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import {
  formatMeetingDateLong,
  isEditableMeetingDate,
  monthFromMeeting,
  resolveMeetingDateKey,
} from "@/lib/meetings/cadence";

export default async function MemberPlanPage({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string }>;
  searchParams: Promise<{ month?: string; meeting?: string }>;
}) {
  const viewer = await requireUser();
  const { userId } = await params;
  const { month: monthParam, meeting: meetingParam } = await searchParams;
  const meeting = resolveMeetingDateKey(meetingParam);
  const month = monthParam || monthFromMeeting(meeting);
  await connectDB();
  const person = serialize(await User.findById(userId).lean()) as { id: string; name: string; jobTitle?: string } | null;
  if (!person) notFound();
  const data = await getMyWorkData(userId, month, meeting);
  const own = viewer.id === userId;

  return (
    <div>
      <PageHeader
        title={person.name.split(" ")[0]}
        description={`${person.jobTitle ?? ""} · ${formatMeetingDateLong(meeting)}`}
        actions={<Button render={<Link href={`/brief?meeting=${meeting}`} />}>Share screen</Button>}
      />
      <div className="mb-6">
        <MeetingLinkBar meeting={meeting} pathname={`/team/${userId}`} />
      </div>
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Progress" value={`${(data.summary as { progress: number }).progress}%`} />
        <StatCard label="Completed" value={(data.summary as { completed: number }).completed} tone="success" />
        <StatCard label="Blocked" value={(data.summary as { blocked: number }).blocked} tone="danger" />
        <StatCard label="At risk" value={(data.summary as { atRisk: number }).atRisk} tone="warning" />
      </div>
      <div className="mb-6">
        <ProgressBar value={(data.summary as { progress: number }).progress} className="h-2" />
      </div>
      {(data.tasks as Array<Record<string, unknown>>).length === 0 ? (
        <EmptyState title="No pieces assigned yet." />
      ) : (
        <StatusTable
          tasks={data.tasks as never}
          editable={(own || isLeadership(viewer)) && isEditableMeetingDate(meeting)}
          meetingDate={meeting}
        />
      )}
    </div>
  );
}
