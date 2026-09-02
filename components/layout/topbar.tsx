"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { formatMonthLabel, shiftMonth } from "@/lib/dates";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  followingMeetingDateKey,
  formatMeetingDateLabel,
  MEETING_TIME_LABEL,
  nextMeetingDateKey,
  presentMeetingDateKey,
  previousMeetingDateKey,
  recentMeetingDateKeys,
} from "@/lib/meetings/cadence";

export function Topbar({ month, basePath }: { month: string; basePath: string }) {
  const prev = shiftMonth(month, -1);
  const next = shiftMonth(month, 1);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background/90 px-6 backdrop-blur">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon-sm" render={<Link href={`${basePath}?month=${prev}`} />}>
          <ChevronLeft />
        </Button>
        <p className="min-w-36 text-center text-sm font-semibold">{formatMonthLabel(month)}</p>
        <Button variant="ghost" size="icon-sm" render={<Link href={`${basePath}?month=${next}`} />}>
          <ChevronRight />
        </Button>
      </div>
      <button
        type="button"
        onClick={() => {
          window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }));
        }}
        className="flex h-8 items-center gap-2 rounded-lg border bg-card px-3 text-xs text-muted-foreground"
      >
        <Search className="size-3.5" />
        Search
        <kbd className="ml-6 rounded border px-1.5 py-0.5 text-[10px]">⌘K</kbd>
      </button>
    </header>
  );
}

export function MonthLinkBar({ month, pathname }: { month: string; pathname: string }) {
  const prev = shiftMonth(month, -1);
  const next = shiftMonth(month, 1);
  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" render={<Link href={`${pathname}?month=${prev}`} />}>
        <ChevronLeft /> {formatMonthLabel(prev)}
      </Button>
      <Button variant="outline" size="sm" render={<Link href={`${pathname}?month=${next}`} />}>
        {formatMonthLabel(next)} <ChevronRight />
      </Button>
    </div>
  );
}

export function MeetingLinkBar({
  meeting,
  pathname,
}: {
  meeting: string;
  pathname: string;
}) {
  const prev = previousMeetingDateKey(meeting);
  const next = followingMeetingDateKey(meeting);
  const working = nextMeetingDateKey();
  const present = presentMeetingDateKey();
  const isWorking = meeting === working;
  const recent = recentMeetingDateKeys(8);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" className="max-w-[46%] truncate sm:max-w-none" render={<Link href={`${pathname}?meeting=${prev}`} />}>
          <ChevronLeft /> <span className="hidden sm:inline">{formatMeetingDateLabel(prev)}</span>
        </Button>
        <div className="min-w-0 flex-1 px-1 text-center sm:min-w-40 sm:flex-none">
          <p className="text-sm font-semibold">{formatMeetingDateLabel(meeting)}</p>
          <p className="text-[11px] text-muted-foreground">
            {meeting > working
              ? "Upcoming call"
              : present && meeting === present
                ? `Today’s call · ${MEETING_TIME_LABEL}`
                : isWorking
                  ? `Next call · ${MEETING_TIME_LABEL}`
                  : "Past call · view only"}
          </p>
        </div>
        <Button variant="outline" size="sm" className="max-w-[46%] truncate sm:max-w-none" render={<Link href={`${pathname}?meeting=${next}`} />}>
          <span className="hidden sm:inline">{formatMeetingDateLabel(next)}</span> <ChevronRight />
        </Button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {recent.map((key) => {
          const active = key === meeting;
          const isPresent = Boolean(present) && key === present;
          const isNext = key === working && key !== present;
          const isUpcoming = key > working;
          return (
            <Link
              key={key}
              href={`${pathname}?meeting=${key}`}
              className={cn(
                "rounded-full px-2.5 py-1 text-[11px] font-medium",
                isPresent && "bg-indigo-600 text-white",
                isNext && "bg-amber-500 text-white",
                isUpcoming && !active && "border border-amber-200 bg-amber-50 text-amber-900 hover:border-amber-300",
                !isPresent && !isNext && !isUpcoming && active && "bg-primary text-primary-foreground",
                !isPresent && !isNext && !isUpcoming && !active && "border bg-background text-muted-foreground hover:border-primary/30 hover:text-foreground",
                active && "ring-2 ring-foreground/25 ring-offset-1",
              )}
            >
              {formatMeetingDateLabel(key)}
              {isPresent ? " · today" : isNext ? " · next" : isUpcoming ? " · upcoming" : ""}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
