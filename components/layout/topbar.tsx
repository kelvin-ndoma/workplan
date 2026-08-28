"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { formatMonthLabel, shiftMonth } from "@/lib/dates";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  followingMeetingDateKey,
  formatMeetingDateLabel,
  lastCompletedMeetingDateKey,
  MEETING_TIME_LABEL,
  nextMeetingDateKey,
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
  const current = lastCompletedMeetingDateKey();
  const isWorking = meeting === working;
  const recent = recentMeetingDateKeys(8);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" render={<Link href={`${pathname}?meeting=${prev}`} />}>
          <ChevronLeft /> {formatMeetingDateLabel(prev)}
        </Button>
        <div className="min-w-40 px-1 text-center">
          <p className="text-sm font-semibold">{formatMeetingDateLabel(meeting)}</p>
          <p className="text-[11px] text-muted-foreground">
            {meeting > working
              ? "Upcoming call"
              : isWorking
                ? `Next call · ${MEETING_TIME_LABEL}`
                : "Past call · view only"}
          </p>
        </div>
        <Button variant="outline" size="sm" render={<Link href={`${pathname}?meeting=${next}`} />}>
          {formatMeetingDateLabel(next)} <ChevronRight />
        </Button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {recent.map((key) => {
          const active = key === meeting;
          const isCurrent = key === current && key !== working;
          const isNext = key === working;
          const isUpcoming = key > working;
          return (
            <Link
              key={key}
              href={`${pathname}?meeting=${key}`}
              className={cn(
                "rounded-full px-2.5 py-1 text-[11px] font-medium",
                isCurrent && "bg-indigo-600 text-white",
                isNext && "bg-amber-500 text-white",
                isUpcoming && !active && "border border-amber-200 bg-amber-50 text-amber-900 hover:border-amber-300",
                !isCurrent && !isNext && !isUpcoming && active && "bg-primary text-primary-foreground",
                !isCurrent && !isNext && !isUpcoming && !active && "border bg-background text-muted-foreground hover:border-primary/30 hover:text-foreground",
                active && "ring-2 ring-foreground/25 ring-offset-1",
              )}
            >
              {formatMeetingDateLabel(key)}
              {isCurrent ? " · current" : isNext ? " · next" : isUpcoming ? " · upcoming" : ""}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
