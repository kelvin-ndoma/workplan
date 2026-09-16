"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

function filenameFromHeader(header: string | null) {
  const match = header?.match(/filename="([^"]+)"/);
  return match?.[1] ?? `workplan-team-${new Date().toISOString().slice(0, 10)}.json`;
}

export function TeamWorkpackPanel() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [fileName, setFileName] = useState("");
  const [preview, setPreview] = useState("");
  const [previewName, setPreviewName] = useState("");

  function loadPack(mode: "view" | "download") {
    startTransition(async () => {
      const response = await fetch(
        mode === "view" ? "/api/admin/workpack?view=1" : "/api/admin/workpack",
      );
      if (!response.ok) {
        toast.error("Could not load team work.");
        return;
      }
      const text = await response.text();
      const name = filenameFromHeader(response.headers.get("content-disposition"));
      if (mode === "download") {
        const blob = new Blob([text], { type: "application/json;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = name;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
        toast.success("Saved a JSON file you can open or upload on the other WorkPlan.");
      }
      setPreviewName(name);
      setPreview(text);
    });
  }

  return (
    <section className="rounded-2xl border bg-card p-5">
      <h2 className="text-sm font-semibold tracking-wide uppercase">Move team work</h2>
      <p className="mt-1 mb-4 text-sm text-muted-foreground">
        View the JSON here, copy it, or save the file. Upload that same JSON on another WorkPlan with
        the same setup. People are matched by email. Passwords are not copied — new people still need
        an invite.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" disabled={pending} onClick={() => loadPack("view")}>
          {pending && !preview ? "Loading…" : "View JSON"}
        </Button>
        <Button type="button" variant="outline" disabled={pending} onClick={() => loadPack("download")}>
          Download JSON
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="application/json,.json,text/plain"
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
        <Button type="button" disabled={pending} onClick={() => inputRef.current?.click()}>
          {pending ? "Working…" : "Upload JSON"}
        </Button>
        {fileName ? <span className="text-xs text-muted-foreground">{fileName}</span> : null}
      </div>
      {preview ? (
        <div className="mt-4 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">{previewName}</p>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={async () => {
                await navigator.clipboard.writeText(preview);
                toast.success("JSON copied.");
              }}
            >
              Copy JSON
            </Button>
          </div>
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
