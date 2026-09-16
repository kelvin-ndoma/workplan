"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function TeamWorkpackPanel() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [fileName, setFileName] = useState("");

  return (
    <section className="rounded-2xl border bg-card p-5">
      <h2 className="text-sm font-semibold tracking-wide uppercase">Move team work</h2>
      <p className="mt-1 mb-4 text-sm text-muted-foreground">
        Download this team’s projects, deliverables, tasks, and status. Upload that file on another
        WorkPlan with the same setup. People are matched by email. Passwords are not copied — new
        people still need an invite.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" render={<a href="/api/admin/workpack" />}>
          Download work
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            setFileName(file?.name ?? "");
            if (!file) return;
            startTransition(async () => {
              const body = new FormData();
              body.set("file", file);
              const response = await fetch("/api/admin/workpack", { method: "POST", body });
              const result = (await response.json().catch(() => ({}))) as {
                error?: string;
                counts?: { tasks?: number; projects?: number; peopleCreated?: number };
              };
              if (!response.ok) {
                toast.error(result.error ?? "Could not upload that file.");
                return;
              }
              toast.success(
                `Imported ${result.counts?.projects ?? 0} projects and ${result.counts?.tasks ?? 0} tasks.`,
              );
              setFileName("");
              if (inputRef.current) inputRef.current.value = "";
              router.refresh();
            });
          }}
        />
        <Button
          type="button"
          disabled={pending}
          onClick={() => inputRef.current?.click()}
        >
          {pending ? "Uploading…" : "Upload work"}
        </Button>
        {fileName ? (
          <span className="text-xs text-muted-foreground">{fileName}</span>
        ) : null}
      </div>
    </section>
  );
}
