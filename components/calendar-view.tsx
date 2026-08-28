"use client";

import { useMemo, useState } from "react";
import {
  addDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { isMeetingDateKey, lastCompletedMeetingDateKey, MEETING_TIME_LABEL, nextMeetingDateKey } from "@/lib/meetings/cadence";

type CalItem = {
  id: string;
  title: string;
  date: string;
  href: string;
  color?: string;
  kind: "task" | "meeting" | "call";
};

export function WorkCalendar({ items }: { items: CalItem[] }) {
  const [anchor, setAnchor] = useState(new Date());
  const [view, setView] = useState<"month" | "week" | "day">("month");
  const nextKey = nextMeetingDateKey();
  const currentKey = lastCompletedMeetingDateKey();
  const sameCall = currentKey === nextKey;

  const days = useMemo(() => {
    if (view === "day") return [anchor];
    if (view === "week") {
      const start = startOfWeek(anchor, { weekStartsOn: 1 });
      return eachDayOfInterval({ start, end: endOfWeek(anchor, { weekStartsOn: 1 }) });
    }
    const start = startOfWeek(startOfMonth(anchor), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(anchor), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [anchor, view]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAnchor(addDays(anchor, view === "month" ? -30 : view === "week" ? -7 : -1))}
          >
            Previous
          </Button>
          <h2 className="min-w-40 text-center text-base font-semibold tracking-tight">
            {format(anchor, view === "day" ? "EEEE, MMM d" : "MMMM yyyy")}
          </h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAnchor(addDays(anchor, view === "month" ? 30 : view === "week" ? 7 : 1))}
          >
            Next
          </Button>
        </div>
        <div className="flex gap-1 rounded-lg border bg-card p-0.5">
          {(["month", "week", "day"] as const).map((item) => (
            <Button key={item} size="sm" variant={view === item ? "default" : "ghost"} onClick={() => setView(item)}>
              {item}
            </Button>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-4 text-[11px]">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-indigo-500" />
          Current call
        </span>
        {!sameCall ? (
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-amber-500" />
            Next call
          </span>
        ) : null}
        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
          <span className="size-2.5 rounded-sm bg-teal-200" />
          Other call days
        </span>
      </div>
      <div className={`grid gap-1.5 ${view === "month" ? "grid-cols-7" : view === "week" ? "grid-cols-7" : "grid-cols-1"}`}>
        {view !== "day"
          ? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((label) => (
              <div
                key={label}
                className={cn(
                  "px-2 pb-1 text-[11px] font-medium uppercase",
                  label === "Tue" || label === "Fri" ? "text-teal-800" : "text-muted-foreground",
                )}
              >
                {label}
              </div>
            ))
          : null}
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const dayItems = items.filter((item) => {
            const itemKey = item.date.slice(0, 10);
            if (item.kind === "call") return itemKey === key;
            return isSameDay(new Date(item.date), day);
          });
          const meetingDay = isMeetingDateKey(key);
          const isCurrent = key === currentKey;
          const isNext = key === nextKey && !sameCall;
          const callKind = isCurrent ? "current" : isNext ? "next" : meetingDay ? "other" : null;
          return (
            <div
              key={key}
              className={cn(
                "min-h-28 rounded-xl border p-2 text-left",
                callKind === "current" && "border-indigo-300 bg-indigo-50 ring-2 ring-indigo-400/70",
                callKind === "next" && "border-amber-300 bg-amber-50 ring-2 ring-amber-400/70",
                callKind === "other" && "border-teal-100 bg-teal-50/45",
                !callKind && "border-border/80 bg-card",
                !isSameMonth(day, anchor) && view === "month" ? "opacity-45" : "",
              )}
            >
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setAnchor(day);
                    setView("day");
                  }}
                  className="text-xs font-semibold"
                >
                  {format(day, "d")}
                </button>
                {callKind ? (
                  <Link
                    href={`/my-work?meeting=${key}`}
                    className={cn(
                      "text-[10px] font-semibold tracking-wide uppercase hover:underline",
                      callKind === "current" && "text-indigo-800",
                      callKind === "next" && "text-amber-800",
                      callKind === "other" && "text-teal-800",
                    )}
                  >
                    {callKind === "current" ? "Current" : callKind === "next" ? "Next" : "Call"}
                  </Link>
                ) : null}
              </div>
              {callKind ? (
                <p
                  className={cn(
                    "mt-1 text-[10px]",
                    callKind === "current" && "text-indigo-800/80",
                    callKind === "next" && "text-amber-800/80",
                    callKind === "other" && "text-teal-800/80",
                  )}
                >
                  {MEETING_TIME_LABEL}
                </p>
              ) : null}
              <div className="mt-2 space-y-1">
                {dayItems.slice(0, view === "month" ? 3 : 8).map((item) => (
                  <Link
                    key={`${item.kind}-${item.id}`}
                    href={item.href}
                    className="block truncate rounded-md px-1.5 py-0.5 text-[11px] text-white"
                    style={{
                      background:
                        item.color ||
                        (item.kind === "call"
                          ? callKind === "current"
                            ? "#4f46e5"
                            : callKind === "next"
                              ? "#d97706"
                              : "#0f766e"
                          : item.kind === "meeting"
                            ? "#0f766e"
                            : "#2563eb"),
                    }}
                  >
                    {item.kind === "call"
                      ? callKind === "current"
                        ? "Current call"
                        : callKind === "next"
                          ? "Next call"
                          : item.title
                      : item.title}
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
