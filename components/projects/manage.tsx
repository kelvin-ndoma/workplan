"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { deleteDeliverableAction, deleteProjectAction, deleteTaskAction } from "@/app/actions/work";
import { Button } from "@/components/ui/button";
import { DeliverableForm } from "@/components/forms";
import { ProgressBar } from "@/components/work-ui";

function asDateInput(value?: unknown) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

function asId(value: unknown) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object" && value && "id" in value) return String((value as { id: unknown }).id);
  return String(value);
}

export function DeleteProjectButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      disabled={pending}
      onClick={() => {
        if (
          !window.confirm(
            `Delete “${name}”? This also deletes its deliverables and tasks. This cannot be undone.`,
          )
        ) {
          return;
        }
        startTransition(async () => {
          const result = await deleteProjectAction(id);
          if (result && "error" in result && result.error) {
            toast.error(result.error);
            return;
          }
          toast.success("Project deleted");
          router.push("/projects");
          router.refresh();
        });
      }}
    >
      {pending ? "Deleting…" : "Delete"}
    </Button>
  );
}

export function DeleteTaskButton({
  id,
  name,
  redirectTo,
}: {
  id: string;
  name: string;
  redirectTo?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      disabled={pending}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        if (!window.confirm(`Delete “${name}”? This cannot be undone.`)) return;
        startTransition(async () => {
          const result = await deleteTaskAction(id);
          if (result && "error" in result && result.error) {
            toast.error(result.error);
            return;
          }
          toast.success("Task deleted");
          if (redirectTo) router.push(redirectTo);
          router.refresh();
        });
      }}
    >
      {pending ? "Deleting…" : "Delete"}
    </Button>
  );
}

export function DeliverableManager({
  projectId,
  users,
  deliverables,
  canManage,
}: {
  projectId: string;
  users: Array<{ id: string; name: string }>;
  deliverables: Array<Record<string, unknown>>;
  canManage: boolean;
}) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      {deliverables.map((item) => {
        const id = String(item.id);
        const name = String(item.name);
        const editing = editingId === id;
        return (
          <div key={id} className="rounded-lg border px-3 py-3">
            <div className="mb-1 flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="font-medium">{name}</span>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">{Number(item.progress)}%</span>
                {canManage ? (
                  <>
                    <Button type="button" size="sm" variant="outline" onClick={() => setEditingId(editing ? null : id)}>
                      {editing ? "Close" : "Edit"}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={pendingId === id}
                      onClick={() => {
                        if (
                          !window.confirm(
                            `Delete “${name}”? Tasks under this deliverable will also be deleted.`,
                          )
                        ) {
                          return;
                        }
                        setPendingId(id);
                        void deleteDeliverableAction(id).then((result) => {
                          setPendingId(null);
                          if (result && "error" in result && result.error) {
                            toast.error(result.error);
                            return;
                          }
                          toast.success("Deliverable deleted");
                          router.refresh();
                        });
                      }}
                    >
                      {pendingId === id ? "Deleting…" : "Delete"}
                    </Button>
                  </>
                ) : null}
              </div>
            </div>
            <ProgressBar value={Number(item.progress)} />
            {editing ? (
              <div className="mt-3 border-t pt-3">
                <DeliverableForm
                  projectId={projectId}
                  users={users}
                  deliverable={{
                    id,
                    name,
                    description: String(item.description || ""),
                    ownerId: asId(item.ownerId),
                    dueDate: asDateInput(item.dueDate),
                    status: String(item.status || "ACTIVE"),
                  }}
                  onSaved={() => setEditingId(null)}
                />
              </div>
            ) : null}
          </div>
        );
      })}
      {deliverables.length === 0 ? (
        <p className="text-sm text-muted-foreground">No deliverables yet.</p>
      ) : null}
    </div>
  );
}
