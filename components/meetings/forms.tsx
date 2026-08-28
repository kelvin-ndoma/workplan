"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createMeetingAction, saveMeetingNotesAction } from "@/app/actions/work";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { currentWorkPlanMonth } from "@/lib/dates";
import {
  dateInputValue,
  defaultMeetingAgenda,
  defaultMeetingTitle,
  nextFridayMeeting,
  nextMeetingDate,
  nextTuesdayMeeting,
} from "@/lib/meetings/cadence";
import { cn } from "@/lib/utils";

export function MeetingForm({
  users,
  projects,
}: {
  users: Array<{ id: string; name: string }>;
  projects: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [date, setDate] = useState(() => dateInputValue(nextMeetingDate()));
  const [title, setTitle] = useState(() => defaultMeetingTitle(nextMeetingDate()));
  const tuesday = useMemo(() => nextTuesdayMeeting(), []);
  const friday = useMemo(() => nextFridayMeeting(), []);

  function applyDate(next: Date) {
    setDate(dateInputValue(next));
    setTitle(defaultMeetingTitle(next));
  }

  return (
    <form
      className="grid gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        startTransition(async () => {
          const result = await createMeetingAction({
            title: String(form.get("title")),
            date: String(form.get("date")),
            startTime: String(form.get("startTime") || "15:30"),
            endTime: String(form.get("endTime") || "16:30"),
            participantIds: form.getAll("participantIds").map(String),
            projectIds: form.getAll("projectIds").map(String),
            agenda: String(form.get("agenda") || "")
              .split("\n")
              .map((line) => line.trim())
              .filter(Boolean),
            workPlanMonth: String(form.get("date") || currentWorkPlanMonth()).slice(0, 7),
          });
          if (result && "error" in result && result.error) {
            toast.error(result.error);
            return;
          }
          toast.success("Meeting created");
          router.push(`/meetings/${result.id}`);
        });
      }}
    >
      <div className="grid gap-2">
        <Label>Meeting day</Label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => applyDate(tuesday)}
            className={cn(
              "rounded-xl border px-3 py-2.5 text-left text-sm transition-colors",
              date === dateInputValue(tuesday)
                ? "border-primary/40 bg-primary/5 font-medium"
                : "hover:border-primary/20",
            )}
          >
            Next Tuesday
            <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
              {tuesday.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
            </span>
          </button>
          <button
            type="button"
            onClick={() => applyDate(friday)}
            className={cn(
              "rounded-xl border px-3 py-2.5 text-left text-sm transition-colors",
              date === dateInputValue(friday)
                ? "border-primary/40 bg-primary/5 font-medium"
                : "hover:border-primary/20",
            )}
          >
            Next Friday
            <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
              {friday.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
            </span>
          </button>
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" value={title} onChange={(event) => setTitle(event.target.value)} required />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="grid gap-2">
          <Label htmlFor="date">Date</Label>
          <Input
            id="date"
            name="date"
            type="date"
            value={date}
            onChange={(event) => {
              setDate(event.target.value);
              const next = new Date(`${event.target.value}T12:00:00`);
              if (!Number.isNaN(next.getTime())) setTitle(defaultMeetingTitle(next));
            }}
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="startTime">Starts</Label>
          <Input id="startTime" name="startTime" type="time" defaultValue="15:30" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="endTime">Ends</Label>
          <Input id="endTime" name="endTime" type="time" defaultValue="16:30" />
        </div>
      </div>
      <input type="hidden" name="workPlanMonth" value={date.slice(0, 7)} />

      <fieldset className="grid gap-2">
        <Label>People</Label>
        <div className="max-h-40 space-y-1 overflow-auto rounded-xl border p-2">
          {users.map((user) => (
            <label key={user.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-muted/70">
              <input type="checkbox" name="participantIds" value={user.id} defaultChecked className="size-3.5 accent-primary" />
              {user.name}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="grid gap-2">
        <Label>Projects</Label>
        <div className="max-h-36 space-y-1 overflow-auto rounded-xl border p-2">
          {projects.map((project) => (
            <label key={project.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-muted/70">
              <input type="checkbox" name="projectIds" value={project.id} defaultChecked className="size-3.5 accent-primary" />
              {project.name}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-2">
        <Label htmlFor="agenda">Agenda</Label>
        <Textarea id="agenda" name="agenda" rows={5} defaultValue={defaultMeetingAgenda().join("\n")} />
      </div>

      <Button type="submit" disabled={pending}>
        Create meeting
      </Button>
    </form>
  );
}

export function MeetingNotesForm({ id, notes, summary }: { id: string; notes?: string; summary?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <form
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        startTransition(async () => {
          await saveMeetingNotesAction(id, String(form.get("notes")), String(form.get("summary")));
          toast.success("Notes saved");
          router.refresh();
        });
      }}
    >
      <div className="grid gap-2">
        <Label htmlFor="summary">Summary</Label>
        <Textarea id="summary" name="summary" defaultValue={summary} placeholder="What the team decided and owns next" rows={4} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" defaultValue={notes} placeholder="Host notes" rows={6} />
      </div>
      <Button type="submit" disabled={pending}>
        Save notes
      </Button>
    </form>
  );
}
