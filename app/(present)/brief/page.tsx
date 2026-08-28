import { requireUser } from "@/lib/session";
import { getTeamDashboard } from "@/lib/queries";
import { BriefDriver } from "@/components/status/brief-driver";
import { canShareScreen } from "@/lib/permissions";
import { redirect } from "next/navigation";
import {
  formatMeetingDateLong,
  MEETING_TIME_LABEL,
  monthFromMeeting,
  nextMeetingDateKey,
  resolveMeetingDateKey,
} from "@/lib/meetings/cadence";

export const dynamic = "force-dynamic";

export default async function BriefPage({
  searchParams,
}: {
  searchParams: Promise<{ meeting?: string }>;
}) {
  const user = await requireUser();
  if (!canShareScreen(user)) redirect("/my-work");
  const { meeting: meetingParam } = await searchParams;
  const meeting = resolveMeetingDateKey(meetingParam);
  const working = nextMeetingDateKey();
  const data = await getTeamDashboard(monthFromMeeting(meeting), meeting);

  return (
    <BriefDriver
      meetingDate={meeting}
      meetingLabel={formatMeetingDateLong(meeting)}
      meetingTime={MEETING_TIME_LABEL}
      isWorking={meeting === working}
      members={data.members.map((member) => ({
        user: member.user as { id: string; name: string; jobTitle?: string; avatar?: string },
        summary: member.summary,
        tasks: member.tasks as never,
      }))}
    />
  );
}
