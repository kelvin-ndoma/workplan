"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { createTaskAction } from "@/app/actions/work";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { currentWorkPlanMonth } from "@/lib/dates";
import { cn } from "@/lib/utils";

const NEW = "__new__";

type Person = { id: string; name: string };
type Project = { id: string; name: string; color?: string; progress?: number; description?: string };
type Deliverable = { id: string; name: string; projectId: string };

function projectIdOf(item: { projectId: unknown }) {
  if (item.projectId && typeof item.projectId === "object" && "id" in item.projectId) {
    return String((item.projectId as { id: string }).id);
  }
  return String(item.projectId ?? "");
}

export function AssignWorkspace({
  users,
  projects,
  deliverables,
  defaultAssignee,
  currentUserId,
  stayOnPage = false,
  month,
  defaultProjectId,
}: {
  users: Person[];
  projects: Project[];
  deliverables: Deliverable[];
  defaultAssignee?: string;
  currentUserId?: string;
  stayOnPage?: boolean;
  month?: string;
  defaultProjectId?: string;
}) {
  const router = useRouter();
  const startingProject =
    defaultProjectId && projects.some((project) => project.id === defaultProjectId)
      ? defaultProjectId
      : (projects[0]?.id ?? NEW);
  const [projectId, setProjectId] = useState(startingProject);
  const [deliverableId, setDeliverableId] = useState("");
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(
    () => deliverables.filter((item) => projectIdOf(item) === projectId),
    [deliverables, projectId],
  );
  const selected = projects.find((project) => project.id === projectId);
  const addingProject = projectId === NEW;
  const addingDeliverable = addingProject || deliverableId === NEW || filtered.length === 0;
  const activeDeliverableId = addingDeliverable
    ? NEW
    : deliverableId && deliverableId !== NEW
      ? deliverableId
      : (filtered[0]?.id ?? NEW);

  return (
    <form
      className="grid items-start gap-6 xl:grid-cols-[minmax(22rem,28rem)_minmax(0,1fr)]"
      onSubmit={(event) => {
        event.preventDefault();
        const formEl = event.currentTarget;
        const form = new FormData(formEl);
        startTransition(async () => {
          const assignedToIds = form.getAll("assignedToIds").map(String).filter(Boolean);
          const result = await createTaskAction({
            title: String(form.get("title")),
            description: String(form.get("description") ?? ""),
            projectId: addingProject ? "" : projectId,
            newProjectName: addingProject ? String(form.get("newProjectName") ?? "") : "",
            deliverableId: addingDeliverable ? "" : activeDeliverableId,
            newDeliverableName: addingDeliverable ? String(form.get("newDeliverableName") ?? "") : "",
            assignedToIds,
            dueDate: String(form.get("dueDate") || ""),
            workPlanMonth: month || currentWorkPlanMonth(),
          });
          if (result && "error" in result && result.error) {
            toast.error(result.error);
            return;
          }
          const count = "count" in result ? Number(result.count) : 1;
          toast.success(count > 1 ? `Assigned to ${count} people.` : "Task assigned.");
          if (stayOnPage) {
            formEl.reset();
            setProjectId(projects[0]?.id ?? NEW);
            setDeliverableId("");
            router.refresh();
            return;
          }
          router.push("/team");
        });
      }}
    >
      <aside className="xl:sticky xl:top-4">
        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Assign</p>
          <h2 className="mt-1 text-lg font-semibold">
            {addingProject ? "New project" : selected?.name || "Pick a project"}
          </h2>

          <div className="mt-5 grid gap-4">
            {addingProject ? (
              <div>
                <Label htmlFor="newProjectName">Project name</Label>
                <Input
                  id="newProjectName"
                  name="newProjectName"
                  placeholder="e.g. General Operations"
                  required
                  className="mt-1"
                  autoFocus
                />
              </div>
            ) : null}

            <div>
              <Label htmlFor="title">Task’s Goal</Label>
              <Input id="title" name="title" placeholder="What needs to get done" required className="mt-1" />
              <Textarea name="description" placeholder="Optional detail" className="mt-2" rows={2} />
            </div>

            {addingDeliverable ? (
              <div>
                <Label>Deliverable name</Label>
                <Input
                  name="newDeliverableName"
                  placeholder={addingProject ? "First deliverable (optional)" : "New deliverable (optional)"}
                  className="mt-1"
                />
                <p className="mt-1 text-xs text-muted-foreground">Blank uses the task’s goal.</p>
              </div>
            ) : null}

            <div>
              <Label>Assign to</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {users.map((person) => (
                  <label
                    key={person.id}
                    className="has-[:checked]:border-primary has-[:checked]:bg-primary/10 inline-flex cursor-pointer items-center gap-2 rounded-full border bg-background px-3 py-1.5 text-sm hover:border-primary/40"
                  >
                    <input
                      type="checkbox"
                      name="assignedToIds"
                      value={person.id}
                      defaultChecked={defaultAssignee === person.id}
                      className="size-3.5 accent-primary"
                    />
                    {person.name.split(" ")[0]}
                    {currentUserId === person.id ? " (you)" : ""}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <Label>Due (optional)</Label>
              <Input name="dueDate" type="date" className="mt-1" />
            </div>

            <Button type="submit" disabled={pending} className="h-10 w-full">
              {pending ? "Assigning…" : "Assign task"}
            </Button>
          </div>
        </div>
      </aside>

      <section>
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Projects</p>
            <p className="mt-0.5 text-sm text-muted-foreground">Click one, or start a new workstream.</p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {projects.map((project) => {
            const count = deliverables.filter((item) => projectIdOf(item) === project.id).length;
            const active = projectId === project.id;
            return (
              <button
                key={project.id}
                type="button"
                onClick={() => {
                  setProjectId(project.id);
                  setDeliverableId("");
                }}
                className={cn(
                  "rounded-2xl border bg-card p-4 text-left transition-all",
                  active
                    ? "border-primary ring-2 ring-primary/20"
                    : "hover:border-primary/30",
                )}
              >
                <div className="flex items-start gap-3">
                  <span
                    className="mt-1 size-2.5 shrink-0 rounded-full"
                    style={{ background: project.color || "#2563eb" }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{project.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {count === 0 ? "No deliverables yet" : `${count} deliverable${count === 1 ? "" : "s"}`}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => {
              setProjectId(NEW);
              setDeliverableId(NEW);
            }}
            className={cn(
              "flex min-h-[5.5rem] items-center justify-center gap-2 rounded-2xl border border-dashed p-4 text-sm font-medium transition-all",
              addingProject
                ? "border-primary bg-primary/5 text-primary ring-2 ring-primary/20"
                : "text-muted-foreground hover:border-primary/40 hover:text-foreground",
            )}
          >
            <Plus className="size-4" />
            New project
          </button>
        </div>

        {addingProject ? null : (
        <div className="mt-6">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {selected?.name ?? "Project"} · deliverables
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
              {filtered.map((item) => {
                const active = activeDeliverableId === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setDeliverableId(item.id)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-sm transition-colors",
                      active ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:border-primary/40",
                    )}
                  >
                    {item.name}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setDeliverableId(NEW)}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border border-dashed px-3 py-1.5 text-sm transition-colors",
                  addingDeliverable
                    ? "border-primary bg-primary/5 text-primary"
                    : "text-muted-foreground hover:border-primary/40 hover:text-foreground",
                )}
              >
                <Plus className="size-3.5" />
                New deliverable
              </button>
          </div>
        </div>
        )}
      </section>
    </form>
  );
}
