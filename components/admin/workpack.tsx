"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

function filenameFromHeader(header: string | null, fallback: string) {
  const match = header?.match(/filename="([^"]+)"/);
  return match?.[1] ?? fallback;
}

export function TeamWorkpackPanel() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [fileName, setFileName] = useState("");
  const [preview, setPreview] = useState("");
  const [previewName, setPreviewName] = useState("");

  function loadPack(kind: "csv" | "json", mode: "view" | "download") {
    startTransition(async () => {
      const format = kind === "csv" ? "csv" : "json";
      const response = await fetch(
        `/api/admin/workpack?format=${format}${mode === "view" ? "&view=1" : ""}`,
      );
      if (!response.ok) {
        toast.error("Could not load team work.");
        return;
      }
      const text = await response.text();
      const fallback =
        kind === "csv"
          ? `workplan-people-${new Date().toISOString().slice(0, 10)}.csv`
          : `workplan-people-${new Date().toISOString().slice(0, 10)}.json`;
      const name = filenameFromHeader(response.headers.get("content-disposition"), fallback);
      if (mode === "download") {
        const blob = new Blob([text], {
          type: kind === "csv" ? "text/csv;charset=utf-8" : "application/json;charset=utf-8",
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = name;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
        toast.success(kind === "csv" ? "Saved CSV (project, title, assignees)." : "Saved JSON (project, title, assignees).");
      }
      setPreviewName(name);
      setPreview(text);
    });
  }

  return (
    <section className="rounded-2xl border bg-card p-5">
      <h2 className="text-sm font-semibold tracking-wide uppercase">Move team work</h2>
      <p className="mt-1 mb-4 text-sm text-muted-foreground">
        The other WorkPlan expects <strong>project</strong>, <strong>title</strong>, and{" "}
        <strong>assignees</strong>. Download CSV or JSON in that layout. Projects match by name.
        Title is the latest deliverable/task. Assignees are roster emails (mike@…), joined with{" "}
        <code>;</code> if more than one person owns the same title.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" disabled={pending} onClick={() => loadPack("csv", "view")}>
          View CSV
        </Button>
        <Button type="button" disabled={pending} onClick={() => loadPack("csv", "download")}>
          Download CSV
        </Button>
        <Button type="button" variant="outline" disabled={pending} onClick={() => loadPack("json", "download")}>
          Download JSON
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.json,text/csv,application/json,text/plain"
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
                counts?: {
                  projectsMatched?: number;
                  projectsCreated?: number;
                  deliverablesCreated?: number;
                  deliverablesMatched?: number;
                  tasksUpdated?: number;
                  tasksCreated?: number;
                  unmatchedProjects?: string[];
                };
              };
              if (!response.ok) {
                toast.error(result.error ?? "Could not upload that file.");
                return;
              }
              const counts = result.counts;
              toast.success(
                `Matched ${counts?.projectsMatched ?? 0} projects, ${counts?.deliverablesMatched ?? 0} deliverables updated, ${counts?.deliverablesCreated ?? 0} new deliverables, ${counts?.tasksUpdated ?? 0} tasks updated, ${counts?.tasksCreated ?? 0} tasks added.`,
              );
              if (counts?.unmatchedProjects?.length) {
                toast.message(
                  `No matching project name for: ${counts.unmatchedProjects.slice(0, 8).join(", ")}. Those were created new.`,
                );
              }
              setFileName("");
              if (inputRef.current) inputRef.current.value = "";
              router.refresh();
            });
          }}
        />
        <Button type="button" variant="outline" disabled={pending} onClick={() => inputRef.current?.click()}>
          {pending ? "Working…" : "Upload CSV or JSON"}
        </Button>
        {fileName ? <span className="text-xs text-muted-foreground">{fileName}</span> : null}
      </div>
      {preview ? (
        <div className="mt-4 space-y-2">
          <p className="text-xs text-muted-foreground">{previewName}</p>
          <textarea
            readOnly
            value={preview}
            spellCheck={false}
            className="h-[28rem] w-full resize-y rounded-lg border bg-muted/40 p-3 font-mono text-xs leading-5"
          />
        </div>
      ) : null}
    </section>
  );
}
