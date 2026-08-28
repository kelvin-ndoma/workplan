"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { statusUpdateAction } from "@/app/actions/work";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ProgressBar, StatusBadge } from "@/components/work-ui";
import { linesToText } from "@/lib/briefing";
import { isEditableMeetingDate } from "@/lib/meetings/cadence";
import type { TaskStatus } from "@/types";

const statuses: TaskStatus[] = ["NOT_STARTED", "IN_PROGRESS", "AT_RISK", "BLOCKED", "COMPLETED"];

export type StatusTask = {
  id: unknown;
  title?: unknown;
  status?: unknown;
  progress?: unknown;
  actionsTaken?: unknown;
  nextActions?: unknown;
  nextAction?: unknown;
  supportDescription?: unknown;
  blocker?: unknown;
  tags?: unknown;
  projectId?: { name?: string } | unknown;
};

function workstream(task: StatusTask) {
  const tags = Array.isArray(task.tags) ? (task.tags as string[]) : [];
  if (tags[0]) return tags[0];
  if (task.projectId && typeof task.projectId === "object" && "name" in task.projectId) {
    return String(task.projectId.name ?? "Workstream");
  }
  return "Workstream";
}

function asLines(task: StatusTask, key: "actionsTaken" | "nextActions") {
  const value = task[key];
  if (Array.isArray(value)) return value.map(String);
  return [];
}

export function StatusTable({
  tasks,
  editable = false,
  meetingDate,
}: {
  tasks: StatusTask[];
  editable?: boolean;
  meetingDate?: string;
}) {
  const canEdit = editable && isEditableMeetingDate(meetingDate);

  if (tasks.length === 0) {
    return (
      <div className="rounded-xl border border-dashed px-5 py-8 text-center text-sm text-muted-foreground">
        No pieces assigned yet.
      </div>
    );
  }

  const groups = tasks.reduce<Record<string, StatusTask[]>>((acc, task) => {
    const key = workstream(task);
    acc[key] = acc[key] ?? [];
    acc[key].push(task);
    return acc;
  }, {});

  return (
    <div className="space-y-8">
      {Object.entries(groups).map(([stream, items]) => (
        <section key={stream}>
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">{stream}</h2>
          <div className="overflow-x-auto rounded-xl border bg-card">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Goal</th>
                  <th className="px-4 py-2.5 font-medium">Actions taken</th>
                  <th className="px-4 py-2.5 font-medium">Actions planned</th>
                  <th className="px-4 py-2.5 font-medium">Support needed</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {items.map((task) => (
                  <StatusRow
                    key={`${String(task.id)}-${meetingDate ?? "live"}`}
                    task={task}
                    editable={canEdit}
                    meetingDate={meetingDate}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}

function StatusRow({
  task,
  editable,
  meetingDate,
}: {
  task: StatusTask;
  editable: boolean;
  meetingDate?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [progress, setProgress] = useState(Number(task.progress ?? 0));
  const [status, setStatus] = useState(String(task.status ?? "NOT_STARTED") as TaskStatus);
  const support = String(task.supportDescription || task.blocker || "");

  return (
    <>
      <tr className="border-b last:border-0 align-top">
        <td className="px-4 py-3">
          {editable ? (
            <Link href={`/tasks/${String(task.id)}`} className="font-medium hover:underline">
              {String(task.title)}
            </Link>
          ) : (
            <p className="font-medium">{String(task.title)}</p>
          )}
          <div className="mt-2 flex items-center gap-2">
            <ProgressBar value={Number(task.progress ?? 0)} className="h-1.5 w-24" />
            <span className="text-xs tabular-nums text-muted-foreground">{Number(task.progress ?? 0)}%</span>
          </div>
        </td>
        <td className="px-4 py-3 text-muted-foreground">
          <CellList items={asLines(task, "actionsTaken")} />
        </td>
        <td className="px-4 py-3 text-muted-foreground">
          <CellList
            items={
              asLines(task, "nextActions").length
                ? asLines(task, "nextActions")
                : task.nextAction
                  ? [String(task.nextAction)]
                  : []
            }
          />
        </td>
        <td className="px-4 py-3 text-muted-foreground">{support || "N/A"}</td>
        <td className="px-4 py-3">
          <div className="flex flex-col items-start gap-2">
            <StatusBadge value={String(task.status)} />
            {editable ? (
              <button
                type="button"
                className="text-xs font-medium text-primary hover:underline"
                onClick={() => setOpen((value) => !value)}
              >
                {open ? "Close" : "Update"}
              </button>
            ) : (
              <span className="text-[11px] text-muted-foreground">View only</span>
            )}
          </div>
        </td>
      </tr>
      {open && editable ? (
        <tr className="border-b bg-muted/20">
          <td colSpan={5} className="px-4 py-4">
            <form
              className="grid gap-3 md:grid-cols-2"
              onSubmit={(event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                startTransition(async () => {
                  const result = await statusUpdateAction({
                    taskId: String(task.id),
                    progress: Number(form.get("progress")),
                    status: String(form.get("status")) as TaskStatus,
                    actionsTaken: String(form.get("actionsTaken") ?? ""),
                    nextActions: String(form.get("nextActions") ?? ""),
                    support: String(form.get("support") ?? ""),
                    meetingDate,
                  });
                  if (result && "error" in result && result.error) {
                    toast.error(result.error);
                    return;
                  }
                  toast.success(meetingDate ? `Saved for ${meetingDate}` : "Status saved");
                  setOpen(false);
                  router.refresh();
                });
              }}
            >
              <label className="grid gap-1 text-xs font-medium">
                Actions taken
                <Textarea
                  name="actionsTaken"
                  rows={4}
                  defaultValue={linesToText(asLines(task, "actionsTaken"))}
                />
              </label>
              <label className="grid gap-1 text-xs font-medium">
                Actions planned
                <Textarea
                  name="nextActions"
                  rows={4}
                  defaultValue={linesToText(
                    asLines(task, "nextActions"),
                    task.nextAction ? String(task.nextAction) : "",
                  )}
                />
              </label>
              <label className="grid gap-1 text-xs font-medium md:col-span-2">
                Support needed
                <Textarea name="support" rows={2} defaultValue={support === "N/A" ? "" : support} />
              </label>
              <label className="grid gap-1 text-xs font-medium">
                Status
                <select
                  name="status"
                  value={status}
                  onChange={(event) => setStatus(event.target.value as TaskStatus)}
                  className="h-8 rounded-lg border border-input bg-background px-2 text-sm font-normal"
                >
                  {statuses.map((item) => (
                    <option key={item} value={item}>
                      {item.replaceAll("_", " ")}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-xs font-medium">
                Progress ({progress}%)
                <input
                  name="progress"
                  type="range"
                  min={0}
                  max={100}
                  value={progress}
                  onChange={(event) => setProgress(Number(event.target.value))}
                  className="mt-2 accent-[oklch(0.40_0.11_255)]"
                />
              </label>
              <div className="flex items-end md:col-span-2">
                <Button type="submit" disabled={pending}>
                  {pending ? "Saving…" : "Save status"}
                </Button>
              </div>
            </form>
          </td>
        </tr>
      ) : null}
    </>
  );
}

function CellList({ items }: { items: string[] }) {
  if (!items.filter(Boolean).length) return <span>—</span>;
  return (
    <ul className="list-disc space-y-1 pl-4">
      {items.filter(Boolean).map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}
