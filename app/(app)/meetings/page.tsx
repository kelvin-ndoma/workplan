import Link from "next/link";
import { requireUser } from "@/lib/session";
import { getMeetingsOverview } from "@/lib/queries";
import { isLeadership } from "@/lib/permissions";
import { EmptyState, PageHeader } from "@/components/work-ui";
import { Button } from "@/components/ui/button";
import { CadenceChip, MeetingCard } from "@/components/meetings/meeting-card";
import { meetingDayName, nextMeetingDate } from "@/lib/meetings/cadence";

export default async function MeetingsPage() {
  const user = await requireUser();
  const { upcoming, past, next } = await getMeetingsOverview(user);
  const nextDay = nextMeetingDate();
  const leadership = isLeadership(user);

  return (
    <div>
      <PageHeader
        title="Meetings"
        description="The team meets Tuesdays and Fridays at 3:30 PM EAT / 8:30 AM ET. Status for each call is saved separately."
        actions={
          leadership ? (
            <Button render={<Link href="/meetings/new" />}>New meeting</Button>
          ) : null
        }
      />

      <div className="mb-8 rounded-xl border border-teal-100 bg-teal-50/50 px-5 py-4">
        <p className="text-xs font-semibold tracking-[0.14em] text-teal-800 uppercase">Weekly rhythm</p>
        <CadenceChip className="mt-1" />
        {!next ? (
          <p className="mt-2 text-sm text-teal-900/80">
            Next meeting day is {meetingDayName(nextDay)},{" "}
            {nextDay.toLocaleDateString(undefined, { month: "long", day: "numeric" })}.
          </p>
        ) : null}
      </div>

      {next ? (
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">
            {next.status === "LIVE" ? "Happening now" : "Up next"}
          </h2>
          <MeetingCard meeting={next} featured />
        </section>
      ) : leadership ? (
        <div className="mb-8">
          <EmptyState
            title={`Schedule the ${meetingDayName(nextDay)} meeting`}
            description="Create it once. The presentation pulls live work from WorkPlan."
          />
        </div>
      ) : null}

      <MeetingGroup
        title="Upcoming"
        items={upcoming.filter((meeting) => meeting.id !== next?.id)}
      />
      <MeetingGroup title="Past" items={past} />
    </div>
  );
}

function MeetingGroup({
  title,
  items,
}: {
  title: string;
  items: Array<Record<string, unknown>>;
}) {
  if (items.length === 0) return null;
  return (
    <section className="mb-8 last:mb-0">
      <h2 className="mb-3 text-sm font-medium text-muted-foreground">{title}</h2>
      <div className="space-y-2">
        {items.map((meeting) => (
          <MeetingCard key={String(meeting.id)} meeting={meeting} />
        ))}
      </div>
    </section>
  );
}
