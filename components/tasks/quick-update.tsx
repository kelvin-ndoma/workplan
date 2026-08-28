"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { quickUpdateAction } from "@/app/actions/work";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { TaskStatus } from "@/types";

const statuses: TaskStatus[] = [
  "NOT_STARTED",
  "IN_PROGRESS",
  "AT_RISK",
  "BLOCKED",
  "COMPLETED",
];

export function QuickUpdateForm({
  taskId,
  progress,
  status,
  compact = false,
}: {
  taskId: string;
  progress: number;
  status: TaskStatus;
  compact?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useState(progress);
  const [currentStatus, setCurrentStatus] = useState(status);
  const [needSupport, setNeedSupport] = useState(false);

  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        startTransition(async () => {
          const result = await quickUpdateAction({
            taskId,
            progress: Number(form.get("progress")),
            status: String(form.get("status")) as TaskStatus,
            accomplished: String(form.get("accomplished") ?? ""),
            nextAction: String(form.get("nextAction") ?? ""),
            supportNeeded: form.get("supportNeeded") === "on",
            supportDetails: String(form.get("supportDetails") ?? ""),
            blocker: String(form.get("blocker") ?? ""),
          });
          if (result && "error" in result && result.error) {
            toast.error(result.error);
            return;
          }
          toast.success("Update saved");
          event.currentTarget.reset();
          setNeedSupport(false);
        });
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor={`progress-${taskId}`}>Progress ({value}%)</Label>
          <input
            id={`progress-${taskId}`}
            name="progress"
            type="range"
            min={0}
            max={100}
            value={value}
            onChange={(event) => setValue(Number(event.target.value))}
            className="mt-2 w-full accent-[oklch(0.40_0.11_255)]"
          />
        </div>
        <div>
          <Label htmlFor={`status-${taskId}`}>Status</Label>
          <select
            id={`status-${taskId}`}
            name="status"
            value={currentStatus}
            onChange={(event) => setCurrentStatus(event.target.value as TaskStatus)}
            className="mt-2 h-8 w-full rounded-lg border border-input bg-background px-2 text-sm"
          >
            {statuses.map((item) => (
              <option key={item} value={item}>
                {item.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <Label htmlFor={`done-${taskId}`}>What did you accomplish?</Label>
        <Textarea id={`done-${taskId}`} name="accomplished" rows={compact ? 2 : 3} className="mt-1" />
      </div>
      <div>
        <Label htmlFor={`next-${taskId}`}>What is next?</Label>
        <Textarea id={`next-${taskId}`} name="nextAction" rows={compact ? 2 : 3} className="mt-1" />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="supportNeeded"
          checked={needSupport}
          onChange={(event) => setNeedSupport(event.target.checked)}
        />
        Do you need support?
      </label>
      {needSupport ? (
        <Input name="supportDetails" placeholder="Support details" />
      ) : null}
      {currentStatus === "BLOCKED" ? (
        <Input name="blocker" placeholder="What is blocking this work?" />
      ) : null}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Saving…" : "Save Update"}
      </Button>
    </form>
  );
}
