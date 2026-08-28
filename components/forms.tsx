"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createDeliverableAction, createProjectAction, createTaskAction } from "@/app/actions/work";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { currentWorkPlanMonth } from "@/lib/dates";

type Option = { id: string; name: string };

export function ProjectForm({
  users,
}: {
  users: Option[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const memberIds = form.getAll("memberIds").map(String);
        startTransition(async () => {
          const result = await createProjectAction({
            name: String(form.get("name")),
            description: String(form.get("description") ?? ""),
            ownerId: String(form.get("ownerId")),
            memberIds,
            status: String(form.get("status") || "ACTIVE"),
            priority: String(form.get("priority") || "MEDIUM"),
            startDate: String(form.get("startDate") || ""),
            targetDate: String(form.get("targetDate") || ""),
            color: String(form.get("color") || "#2563eb"),
          });
          if (result && "error" in result && result.error) {
            toast.error(result.error);
            return;
          }
          toast.success("Project created");
          router.push(`/projects/${result.id}`);
        });
      }}
    >
      <div>
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" required className="mt-1" />
      </div>
      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" className="mt-1" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label>Owner</Label>
          <select name="ownerId" className="mt-1 h-8 w-full rounded-lg border px-2 text-sm" required>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label>Color</Label>
          <Input name="color" type="color" defaultValue="#2563eb" className="mt-1 h-8" />
        </div>
      </div>
      <div>
        <Label>Members</Label>
        <select name="memberIds" multiple className="mt-1 h-32 w-full rounded-lg border px-2 text-sm">
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name}
            </option>
          ))}
        </select>
      </div>
      <Button type="submit" disabled={pending}>
        Create project
      </Button>
    </form>
  );
}

export function TaskForm({
  users,
  projects,
  deliverables,
  defaultAssignee,
  stayOnPage = false,
  month,
}: {
  users: Option[];
  projects: Option[];
  deliverables: Array<Option & { projectId: string }>;
  defaultAssignee?: string;
  stayOnPage?: boolean;
  month?: string;
}) {
  const router = useRouter();
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [pending, startTransition] = useTransition();
  const filtered = deliverables.filter((item) => item.projectId === projectId);

  return (
    <form
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        const formEl = event.currentTarget;
        const form = new FormData(formEl);
        startTransition(async () => {
          const result = await createTaskAction({
            title: String(form.get("title")),
            description: String(form.get("description") ?? ""),
            projectId,
            deliverableId: String(form.get("deliverableId")),
            assignedTo: String(form.get("assignedTo")),
            status: String(form.get("status") || "NOT_STARTED"),
            priority: String(form.get("priority") || "MEDIUM"),
            progress: Number(form.get("progress") || 0),
            weight: Number(form.get("weight") || 1),
            dueDate: String(form.get("dueDate") || ""),
            nextAction: String(form.get("nextAction") || ""),
            workPlanMonth: String(form.get("workPlanMonth") || month || currentWorkPlanMonth()),
          });
          if (result && "error" in result && result.error) {
            toast.error(result.error);
            return;
          }
          toast.success("Assigned — they’ll see it in WorkPlan and get an email if mail is set up.");
          if (stayOnPage) {
            router.refresh();
            formEl.reset();
            return;
          }
          router.push(`/tasks/${result.id}`);
        });
      }}
    >
      <Input name="title" placeholder="Goal / piece of work" required />
      <Textarea name="description" placeholder="What this piece is" />
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label>Project</Label>
          <select
            value={projectId}
            onChange={(event) => setProjectId(event.target.value)}
            className="mt-1 h-8 w-full rounded-lg border px-2 text-sm"
          >
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label>Deliverable</Label>
          <select name="deliverableId" className="mt-1 h-8 w-full rounded-lg border px-2 text-sm" required>
            {filtered.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <Label>Assign to</Label>
          <select name="assignedTo" defaultValue={defaultAssignee} className="mt-1 h-8 w-full rounded-lg border px-2 text-sm">
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label>Priority</Label>
          <select name="priority" className="mt-1 h-8 w-full rounded-lg border px-2 text-sm" defaultValue="MEDIUM">
            <option>LOW</option>
            <option>MEDIUM</option>
            <option>HIGH</option>
            <option>CRITICAL</option>
          </select>
        </div>
        <div>
          <Label>Due</Label>
          <Input name="dueDate" type="date" className="mt-1" />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Input name="progress" type="number" min={0} max={100} defaultValue={0} />
        <Input name="weight" type="number" min={1} defaultValue={1} />
        <Input name="workPlanMonth" defaultValue={month || currentWorkPlanMonth()} />
      </div>
      <Input name="nextAction" placeholder="First action planned" />
      <Button type="submit" disabled={pending}>
        Assign
      </Button>
    </form>
  );
}

export function DeliverableForm({
  projectId,
  users,
}: {
  projectId: string;
  users: Option[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <form
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        startTransition(async () => {
          const result = await createDeliverableAction({
            projectId,
            name: String(form.get("name")),
            description: String(form.get("description") ?? ""),
            ownerId: String(form.get("ownerId")),
            dueDate: String(form.get("dueDate") || ""),
          });
          if (result && "error" in result && result.error) {
            toast.error(result.error);
            return;
          }
          toast.success("Deliverable created");
          router.refresh();
        });
      }}
    >
      <Input name="name" placeholder="Deliverable name" required />
      <Textarea name="description" placeholder="Description" />
      <select name="ownerId" className="h-8 rounded-lg border px-2 text-sm">
        {users.map((user) => (
          <option key={user.id} value={user.id}>
            {user.name}
          </option>
        ))}
      </select>
      <Input name="dueDate" type="date" />
      <Button type="submit" disabled={pending}>
        Add deliverable
      </Button>
    </form>
  );
}
