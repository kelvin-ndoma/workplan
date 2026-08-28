import { requireUser } from "@/lib/session";
import { getCalendarItems } from "@/lib/queries";
import { endOfMonth, startOfMonth, subMonths } from "date-fns";
import { PageHeader } from "@/components/work-ui";
import { WorkCalendar } from "@/components/calendar-view";
import { MEETING_TIME_LABEL, meetingDatesInRange } from "@/lib/meetings/cadence";

export default async function CalendarPage() {
  await requireUser();
  const start = startOfMonth(subMonths(new Date(), 1));
  const end = endOfMonth(new Date(start.getFullYear(), start.getMonth() + 3, 1));
  const data = await getCalendarItems(start, end);
  const calls = meetingDatesInRange(start, end).map((date) => ({
    id: date,
    title: `Team call · ${MEETING_TIME_LABEL}`,
    date,
    href: `/my-work?meeting=${date}`,
    kind: "call" as const,
  }));
  const items = [
    ...calls,
    ...((data.tasks as Array<Record<string, unknown>>) ?? []).map((task) => ({
      id: String(task.id),
      title: String(task.title),
      date: String(task.dueDate),
      href: `/tasks/${task.id}`,
      color: (task.projectId as { color?: string })?.color,
      kind: "task" as const,
    })),
    ...((data.meetings as Array<Record<string, unknown>>) ?? []).map((meeting) => ({
      id: String(meeting.id),
      title: String(meeting.title),
      date: String(meeting.date),
      href: `/meetings/${meeting.id}`,
      kind: "meeting" as const,
    })),
  ];

  return (
    <div>
      <PageHeader
        title="Calendar"
        description={`Tuesday and Friday calls are at ${MEETING_TIME_LABEL}. Click a past Tuesday or Friday to open that call’s saved status.`}
      />
      <WorkCalendar items={items} />
    </div>
  );
}
