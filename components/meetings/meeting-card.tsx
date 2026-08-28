import Link from "next/link";
import { CalendarDays, Clock } from "lucide-react";
import { formatMeetingWhen, meetingDayName, meetingDayShort, toDate } from "@/lib/meetings/cadence";
import { StatusBadge } from "@/components/work-ui";
import { cn } from "@/lib/utils";

type MeetingLike = {
  id?: unknown;
  title?: unknown;
  date?: unknown;
  startTime?: unknown;
  endTime?: unknown;
  status?: unknown;
  hostId?: { name?: string } | string | unknown;
};

export function MeetingCard({
  meeting,
  featured = false,
  href,
}: {
  meeting: MeetingLike;
  featured?: boolean;
  href?: string;
}) {
  const id = String(meeting.id ?? "");
  const date = toDate(meeting.date as string | Date | null);
  const live = meeting.status === "LIVE";
  const host =
    meeting.hostId && typeof meeting.hostId === "object" && "name" in meeting.hostId
      ? String(meeting.hostId.name ?? "")
      : undefined;

  return (
    <Link
      href={href ?? `/meetings/${id}`}
      className={cn(
        "group block rounded-xl border bg-card p-5 transition-colors hover:border-primary/25 hover:bg-white",
        featured && "border-primary/20 bg-white shadow-sm",
        live && "border-red-200 bg-red-50/40",
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-teal-50 px-2 py-0.5 text-[11px] font-semibold tracking-wide text-teal-800 uppercase">
              {meetingDayShort(date)}
            </span>
            <StatusBadge value={meeting.status ? String(meeting.status) : null} />
          </div>
          <p className="font-semibold tracking-tight">{String(meeting.title ?? "Team meeting")}</p>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="size-3.5" />
              {formatMeetingWhen(
                meeting.date as string | Date | null,
                meeting.startTime as string | null,
                meeting.endTime as string | null,
              )}
            </span>
            {host ? (
              <span className="inline-flex items-center gap-1.5">
                <Clock className="size-3.5" />
                Host {host}
              </span>
            ) : null}
          </p>
        </div>
        {featured ? (
          <span className="inline-flex h-7 shrink-0 items-center rounded-lg bg-primary px-2.5 text-sm font-medium text-primary-foreground">
            {live ? "Join live" : "Open"}
          </span>
        ) : null}
      </div>
    </Link>
  );
}

export function CadenceChip({ className }: { className?: string }) {
  return (
    <p className={cn("text-sm text-muted-foreground", className)}>
      Team meetings are <span className="font-medium text-foreground">Tuesdays</span> and{" "}
      <span className="font-medium text-foreground">Fridays</span> at{" "}
      <span className="font-medium text-foreground">3:30 PM EAT / 8:30 AM ET</span>.
    </p>
  );
}

export function MeetingDayBadge({ date }: { date: Date }) {
  return (
    <span className="inline-flex items-center rounded-full bg-teal-50 px-2 py-0.5 text-[11px] font-semibold tracking-wide text-teal-800 uppercase">
      {meetingDayName(date)}
    </span>
  );
}
