"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createDeliverableAction, createProjectAction, reassignTaskAction, updateDeliverableAction, updateProjectAction, updateTaskTitleAction } from "@/app/actions/work";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Option = { id: string; name: string };

type ProjectValues = {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  memberIds: string[];
  status?: string;
  priority?: string;
  startDate?: string;
  targetDate?: string;
  color?: string;
};

export function ProjectForm({
  users,
  project,
}: {
  users: Option[];
  project?: ProjectValues;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const editing = Boolean(project);

  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const memberIds = form.getAll("memberIds").map(String);
        const payload = {
          name: String(form.get("name")),
          description: String(form.get("description") ?? ""),
          ownerId: String(form.get("ownerId")),
          memberIds,
          status: String(form.get("status") || "ACTIVE"),
          priority: String(form.get("priority") || "MEDIUM"),
          startDate: String(form.get("startDate") || ""),
          targetDate: String(form.get("targetDate") || ""),
          color: String(form.get("color") || "#2563eb"),
        };
        startTransition(async () => {
          const result = editing
            ? await updateProjectAction(project!.id, payload)
            : await createProjectAction(payload);
          if (result && "error" in result && result.error) {
            toast.error(result.error);
            return;
          }
          toast.success(editing ? "Project updated" : "Project created");
          router.push(`/projects/${result.id}`);
          router.refresh();
        });
      }}
    >
      <div>
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" required className="mt-1" defaultValue={project?.name} />
      </div>
      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" className="mt-1" defaultValue={project?.description} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label>Owner</Label>
          <select name="ownerId" defaultValue={project?.ownerId} className="mt-1 h-8 w-full rounded-lg border px-2 text-sm" required>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label>Color</Label>
          <Input name="color" type="color" defaultValue={project?.color || "#2563eb"} className="mt-1 h-8" />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label>Status</Label>
          <select name="status" defaultValue={project?.status || "ACTIVE"} className="mt-1 h-8 w-full rounded-lg border px-2 text-sm">
            <option value="PLANNING">PLANNING</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="AT_RISK">AT_RISK</option>
            <option value="ON_HOLD">ON_HOLD</option>
            <option value="COMPLETED">COMPLETED</option>
            <option value="ARCHIVED">ARCHIVED</option>
          </select>
        </div>
        <div>
          <Label>Priority</Label>
          <select name="priority" defaultValue={project?.priority || "MEDIUM"} className="mt-1 h-8 w-full rounded-lg border px-2 text-sm">
            <option>LOW</option>
            <option>MEDIUM</option>
            <option>HIGH</option>
            <option>CRITICAL</option>
          </select>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label>Start</Label>
          <Input name="startDate" type="date" className="mt-1" defaultValue={project?.startDate} />
        </div>
        <div>
          <Label>Target</Label>
          <Input name="targetDate" type="date" className="mt-1" defaultValue={project?.targetDate} />
        </div>
      </div>
      <div>
        <Label>Members</Label>
        <select name="memberIds" multiple defaultValue={project?.memberIds ?? []} className="mt-1 h-32 w-full rounded-lg border px-2 text-sm">
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name}
            </option>
          ))}
        </select>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : editing ? "Save project" : "Create project"}
      </Button>
    </form>
  );
}

export function ReassignTaskForm({
  taskId,
  users,
  currentAssigneeId,
}: {
  taskId: string;
  users: Option[];
  currentAssigneeId?: string;
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
          const result = await reassignTaskAction({
            taskId,
            assignedTo: String(form.get("assignedTo") || ""),
          });
          if (result && "error" in result && result.error) {
            toast.error(result.error);
            return;
          }
          toast.success("Task transferred. Other people’s work is unchanged.");
          router.refresh();
        });
      }}
    >
      <div>
        <Label>Transfer to</Label>
        <select
          name="assignedTo"
          defaultValue={currentAssigneeId}
          className="mt-1 h-8 w-full rounded-lg border px-2 text-sm"
        >
          {users.map((person) => (
            <option key={person.id} value={person.id}>
              {person.name}
            </option>
          ))}
        </select>
      </div>
      <Button type="submit" variant="outline" disabled={pending}>
        {pending ? "Transferring…" : "Transfer task"}
      </Button>
    </form>
  );
}

export function RenameTaskTitleForm({ taskId, title }: { taskId: string; title: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        startTransition(async () => {
          const result = await updateTaskTitleAction({
            taskId,
            title: String(form.get("title") || ""),
          });
          if (result && "error" in result && result.error) {
            toast.error(result.error);
            return;
          }
          toast.success("Deliverable title saved");
          router.refresh();
        });
      }}
    >
      <div>
        <Label htmlFor="title">Deliverable</Label>
        <Input id="title" name="title" defaultValue={title} required minLength={2} className="mt-1" />
      </div>
      <Button type="submit" variant="outline" disabled={pending}>
        {pending ? "Saving…" : "Save title"}
      </Button>
    </form>
  );
}

export function DeliverableForm({
  projectId,
  users,
  deliverable,
  onSaved,
}: {
  projectId: string;
  users: Option[];
  deliverable?: {
    id: string;
    name: string;
    description?: string;
    ownerId: string;
    dueDate?: string;
    status?: string;
  };
  onSaved?: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const editing = Boolean(deliverable);
  return (
    <form
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const payload = {
          projectId,
          name: String(form.get("name")),
          description: String(form.get("description") ?? ""),
          ownerId: String(form.get("ownerId")),
          dueDate: String(form.get("dueDate") || ""),
          status: String(form.get("status") || "ACTIVE"),
        };
        startTransition(async () => {
          const result = editing
            ? await updateDeliverableAction(deliverable!.id, payload)
            : await createDeliverableAction(payload);
          if (result && "error" in result && result.error) {
            toast.error(result.error);
            return;
          }
          toast.success(editing ? "Deliverable updated" : "Deliverable created");
          onSaved?.();
          router.refresh();
        });
      }}
    >
      <Input name="name" placeholder="Deliverable name" required defaultValue={deliverable?.name} />
      <Textarea name="description" placeholder="Description" defaultValue={deliverable?.description} />
      <select name="ownerId" defaultValue={deliverable?.ownerId} className="h-8 rounded-lg border px-2 text-sm">
        {users.map((user) => (
          <option key={user.id} value={user.id}>
            {user.name}
          </option>
        ))}
      </select>
      <select name="status" defaultValue={deliverable?.status || "ACTIVE"} className="h-8 rounded-lg border px-2 text-sm">
        <option value="PLANNING">PLANNING</option>
        <option value="ACTIVE">ACTIVE</option>
        <option value="AT_RISK">AT_RISK</option>
        <option value="ON_HOLD">ON_HOLD</option>
        <option value="COMPLETED">COMPLETED</option>
        <option value="ARCHIVED">ARCHIVED</option>
      </select>
      <Input name="dueDate" type="date" defaultValue={deliverable?.dueDate} />
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : editing ? "Save deliverable" : "Add deliverable"}
      </Button>
    </form>
  );
}
