"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Maximize } from "lucide-react";
import { ProgressBar, StatusBadge, UserAvatar } from "@/components/work-ui";
import { StatusTable, type StatusTask } from "@/components/status/status-table";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Member = {
  user: { id: string; name: string; jobTitle?: string; avatar?: string };
  summary: { progress: number; completed: number; inProgress: number; blocked: number; atRisk: number };
  tasks: StatusTask[];
};

export function BriefDriver({
  members,
  meetingDate,
  meetingLabel,
  meetingTime,
  isWorking,
}: {
  members: Member[];
  meetingDate: string;
  meetingLabel: string;
  meetingTime: string;
  isWorking: boolean;
}) {
  const people = members;
  const [index, setIndex] = useState(0);
  const current = people[index];

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        event.preventDefault();
        setIndex((value) => Math.min(people.length - 1, value + 1));
      }
      if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        event.preventDefault();
        setIndex((value) => Math.max(0, value - 1));
      }
      if (event.key.toLowerCase() === "f") {
        void document.documentElement.requestFullscreen?.();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [people.length]);

  if (!current) {
    return <p className="p-8 text-sm text-muted-foreground">No team members to walk through.</p>;
  }

  return (
    <div className="flex h-dvh bg-[oklch(0.975_0.006_250)]">
      <aside className="hidden h-full w-56 shrink-0 flex-col border-r bg-white lg:flex xl:w-64">
        <div className="border-b px-4 py-4">
          <p className="text-xs font-medium text-muted-foreground">Anyone can drive this</p>
          <p className="mt-1 text-sm font-semibold">Share this tab in Teams</p>
          <p className="mt-2 text-xs text-muted-foreground">
            {meetingLabel}
            <span className="mt-0.5 block">{isWorking ? `Next call · ${meetingTime}` : "Past call"}</span>
          </p>
        </div>
        <nav className="flex-1 overflow-y-auto p-2">
          {people.map((member, i) => (
            <button
              key={member.user.id}
              type="button"
              onClick={() => setIndex(i)}
              className={cn(
                "flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm",
                i === index ? "bg-primary text-primary-foreground" : "hover:bg-muted",
              )}
            >
              <span className="w-5 text-xs tabular-nums opacity-70">{i + 1}</span>
              <span className="min-w-0 flex-1 truncate font-medium">{member.user.name.split(" ")[0]}</span>
              <span className="text-xs tabular-nums opacity-80">{member.summary.progress}%</span>
            </button>
          ))}
        </nav>
        <div className="border-t p-3">
          <Link href={`/team?meeting=${meetingDate}`} className="text-xs text-muted-foreground hover:text-foreground">
            ← Back to team
          </Link>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b bg-white px-3 py-3 sm:px-6 sm:py-4">
          <div className="flex min-w-0 items-center gap-3">
            <UserAvatar name={current.user.name} src={current.user.avatar} size="lg" />
            <div className="min-w-0">
              <p className="truncate text-lg font-semibold tracking-tight sm:text-2xl">{current.user.name}</p>
              <p className="truncate text-sm text-muted-foreground">{current.user.jobTitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <select
              className="h-8 max-w-[10rem] rounded-lg border bg-card px-2 text-sm lg:hidden"
              value={index}
              aria-label="Team member"
              onChange={(event) => setIndex(Number(event.target.value))}
            >
              {people.map((member, i) => (
                <option key={member.user.id} value={i}>
                  {member.user.name.split(" ")[0]}
                </option>
              ))}
            </select>
            {current.summary.blocked > 0 ? (
              <StatusBadge value="BLOCKED" />
            ) : current.summary.atRisk > 0 ? (
              <StatusBadge value="AT_RISK" />
            ) : null}
            <p className="text-2xl font-semibold tabular-nums sm:text-3xl">{current.summary.progress}%</p>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => void document.documentElement.requestFullscreen?.()}
              title="Fullscreen for Teams"
            >
              <Maximize />
            </Button>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto px-3 py-4 sm:px-6 sm:py-5">
          <div className="mb-5 grid max-w-3xl grid-cols-2 gap-3 text-center text-sm sm:grid-cols-4">
            <Stat label="Done" value={current.summary.completed} />
            <Stat label="Active" value={current.summary.inProgress} />
            <Stat label="At risk" value={current.summary.atRisk} />
            <Stat label="Blocked" value={current.summary.blocked} />
          </div>
          <ProgressBar value={current.summary.progress} className="mb-6 h-2" />
          <StatusTable tasks={current.tasks} meetingDate={meetingDate} />
        </div>
        <footer className="flex flex-wrap items-center justify-between gap-2 border-t bg-white px-3 py-3 sm:px-6">
          <Button variant="outline" disabled={index === 0} onClick={() => setIndex((value) => value - 1)}>
            <ChevronLeft /> <span className="hidden sm:inline">Previous</span>
          </Button>
          <p className="order-last w-full text-center text-xs text-muted-foreground sm:order-none sm:w-auto sm:text-sm">
            {index + 1} of {people.length} · share this tab
          </p>
          <Button disabled={index === people.length - 1} onClick={() => setIndex((value) => value + 1)}>
            <span className="hidden sm:inline">Next</span> <ChevronRight />
          </Button>
        </footer>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-white px-3 py-2">
      <p className="text-lg font-semibold tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
