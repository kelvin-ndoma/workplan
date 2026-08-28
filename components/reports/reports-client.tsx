"use client";

import { useState } from "react";
import type { ReportKind } from "@/lib/reports";

const kinds: Array<{ id: ReportKind; label: string }> = [
  { id: "individual", label: "Individual monthly" },
  { id: "team", label: "Team monthly" },
  { id: "project", label: "Project" },
  { id: "weekly", label: "Weekly" },
  { id: "meeting", label: "Meeting" },
  { id: "leadership", label: "Leadership summary" },
];

export function ReportsClient({
  month,
  canViewAll,
  currentUserId,
  users,
  projects,
}: {
  month: string;
  canViewAll: boolean;
  currentUserId: string;
  users: Array<{ id: string; name: string }>;
  projects: Array<{ id: string; name: string }>;
}) {
  const [kind, setKind] = useState<ReportKind>(canViewAll ? "team" : "individual");
  const [userId, setUserId] = useState(currentUserId);
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [currentMonth, setCurrentMonth] = useState(month);

  function href(format: "docx" | "pdf" | "csv") {
    const params = new URLSearchParams({ kind, month: currentMonth, format });
    if (kind === "individual") params.set("userId", userId);
    if (kind === "project") params.set("projectId", projectId);
    return `/api/reports?${params.toString()}`;
  }

  return (
    <div className="max-w-2xl rounded-2xl border bg-card p-6">
      <div className="grid gap-3">
        <label className="text-sm">
          Report type
          <select
            className="mt-1 h-8 w-full rounded-lg border px-2 text-sm"
            value={kind}
            onChange={(event) => setKind(event.target.value as ReportKind)}
          >
            {kinds.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Month
          <input
            type="month"
            className="mt-1 h-8 w-full rounded-lg border px-2 text-sm"
            value={currentMonth}
            onChange={(event) => setCurrentMonth(event.target.value)}
          />
        </label>
        {kind === "individual" ? (
          <label className="text-sm">
            Employee
            <select
              className="mt-1 h-8 w-full rounded-lg border px-2 text-sm"
              value={userId}
              onChange={(event) => setUserId(event.target.value)}
              disabled={!canViewAll}
            >
              {users.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        {kind === "project" ? (
          <label className="text-sm">
            Project
            <select
              className="mt-1 h-8 w-full rounded-lg border px-2 text-sm"
              value={projectId}
              onChange={(event) => setProjectId(event.target.value)}
            >
              {projects.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>
      <div className="mt-6 flex flex-wrap gap-2">
        <a className="rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground" href={href("docx")}>
          Export DOCX
        </a>
        <a className="rounded-lg border px-3 py-2 text-sm" href={href("pdf")}>
          Export PDF
        </a>
        <a className="rounded-lg border px-3 py-2 text-sm" href={href("csv")}>
          Export CSV
        </a>
      </div>
    </div>
  );
}
