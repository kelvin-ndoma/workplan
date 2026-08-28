"use client";

import { useMemo, useState, useTransition } from "react";
import {
  DndContext,
  PointerSensor,
  useDroppable,
  useDraggable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import Link from "next/link";
import { setTaskStatusAction } from "@/app/actions/work";
import { ProgressBar, StatusBadge } from "@/components/work-ui";
import { toast } from "sonner";
import type { TaskStatus } from "@/types";

const columns: TaskStatus[] = [
  "NOT_STARTED",
  "IN_PROGRESS",
  "AT_RISK",
  "BLOCKED",
  "COMPLETED",
];

type BoardTask = {
  id: string;
  title: string;
  progress: number;
  status: TaskStatus;
  projectId?: { name?: string; color?: string };
  assignedTo?: { name?: string };
};

function Card({ task }: { task: BoardTask }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
  });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={`rounded-xl border bg-card p-3 shadow-sm ${isDragging ? "opacity-60" : ""}`}
      {...listeners}
      {...attributes}
    >
      <Link href={`/tasks/${task.id}`} className="block text-sm font-medium hover:underline">
        {task.title}
      </Link>
      <p className="mt-1 text-xs text-muted-foreground">
        {(task.projectId as { name?: string } | undefined)?.name}
      </p>
      <ProgressBar value={task.progress} className="mt-3" />
    </div>
  );
}

function Column({ id, tasks }: { id: TaskStatus; tasks: BoardTask[] }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`flex min-h-120 flex-1 flex-col rounded-2xl border bg-muted/40 p-3 ${isOver ? "ring-2 ring-primary/40" : ""}`}
    >
      <div className="mb-3 flex items-center justify-between">
        <StatusBadge value={id} />
        <span className="text-xs text-muted-foreground">{tasks.length}</span>
      </div>
      <div className="space-y-2">
        {tasks.map((task) => (
          <Card key={task.id} task={task} />
        ))}
      </div>
    </div>
  );
}

export function KanbanBoard({ tasks }: { tasks: BoardTask[] }) {
  const [items, setItems] = useState(tasks);
  const [, startTransition] = useTransition();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const grouped = useMemo(() => {
    return Object.fromEntries(
      columns.map((column) => [column, items.filter((task) => task.status === column)]),
    ) as Record<TaskStatus, BoardTask[]>;
  }, [items]);

  function onDragEnd(event: DragEndEvent) {
    const status = event.over?.id as TaskStatus | undefined;
    const id = String(event.active.id);
    if (!status || !columns.includes(status)) return;
    const current = items.find((task) => task.id === id);
    if (!current || current.status === status) return;
    setItems((prev) => prev.map((task) => (task.id === id ? { ...task, status } : task)));
    startTransition(async () => {
      const result = await setTaskStatusAction(id, status);
      if (result && "error" in result && result.error) {
        toast.error(result.error);
        setItems(tasks);
        return;
      }
      toast.success("Status updated");
    });
  }

  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-4">
        {columns.map((column) => (
          <Column key={column} id={column} tasks={grouped[column]} />
        ))}
      </div>
    </DndContext>
  );
}
