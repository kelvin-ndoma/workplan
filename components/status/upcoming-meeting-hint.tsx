import Link from "next/link";
import { Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  formatMeetingDateLong,
  isEditableMeetingDate,
  MEETING_TIME_LABEL,
  nextMeetingDateKey,
  presentMeetingDateKey,
} from "@/lib/meetings/cadence";

export function UpcomingMeetingHint({ viewing }: { viewing: string }) {
  const next = nextMeetingDateKey();
  const present = presentMeetingDateKey();
  const editingNext = viewing === next;
  const todayCall = Boolean(present) && viewing === present;

  return (
    <div className="mb-4 flex flex-wrap items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
      <Lightbulb className="mt-0.5 size-5 shrink-0 text-amber-700" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-amber-950">
          {todayCall
            ? `Today’s call is ${formatMeetingDateLong(viewing)}`
            : `Edit the upcoming meeting: ${formatMeetingDateLong(next)}`}
        </p>
        <p className="mt-0.5 text-sm text-amber-900/80">
          {todayCall
            ? `Status is editable until 4 hours after ${MEETING_TIME_LABEL}. After that, update the next call.`
            : editingNext
              ? `You’re editing status for the next call at ${MEETING_TIME_LABEL}. Past calls stay view-only.`
              : isEditableMeetingDate(viewing)
                ? "This is a future call. You can save status for this date."
                : "This call is over. Open the next meeting to update your status."}
        </p>
      </div>
      {!editingNext ? (
        <Button size="sm" render={<Link href={`/my-work?meeting=${next}`} />}>
          Edit next meeting
        </Button>
      ) : null}
    </div>
  );
}
