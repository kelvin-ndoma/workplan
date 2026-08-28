import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { getTaskById } from "@/lib/queries";
import { canUpdateTask } from "@/lib/permissions";
import { formatShortDate } from "@/lib/dates";
import { PageHeader, ProgressBar, StatusBadge } from "@/components/work-ui";
import { QuickUpdateForm } from "@/components/tasks/quick-update";
import { CommentThread } from "@/components/comments";
import type { TaskStatus } from "@/types";

export default async function TaskPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const data = await getTaskById(id);
  if (!data) notFound();
  const task = (data as { task: Record<string, unknown> }).task;
  const assignedTo = (task.assignedTo as { id?: string } | undefined)?.id;
  const canEdit = canUpdateTask(user, { assignedTo, createdBy: (task.createdBy as { id?: string })?.id });

  return (
    <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <div>
        <PageHeader
          eyebrow={`${(task.projectId as { name?: string })?.name} · ${(task.deliverableId as { name?: string })?.name}`}
          title={String(task.title)}
          description={String(task.description || "")}
          actions={
            <div className="flex items-center gap-2">
              <StatusBadge value={String(task.status)} />
              <StatusBadge value={String(task.priority)} />
            </div>
          }
        />
        <div className="rounded-2xl border bg-card p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Progress</p>
            <p className="text-2xl font-semibold">{Number(task.progress)}%</p>
          </div>
          <ProgressBar value={Number(task.progress)} className="mt-3 h-3" />
          <div className="mt-5 grid gap-4 sm:grid-cols-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground uppercase">Assigned</p>
              <p className="font-medium">{(task.assignedTo as { name?: string })?.name ?? "Unassigned"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase">Due</p>
              <p className="font-medium">{formatShortDate(task.dueDate as string)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase">Month</p>
              <p className="font-medium">{String(task.workPlanMonth)}</p>
            </div>
          </div>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <Block title="Actions taken" items={(task.actionsTaken as string[]) ?? []} />
          <Block title="Next actions" items={((task.nextActions as string[]) ?? []).length ? (task.nextActions as string[]) : [String(task.nextAction || "")]} />
          <div className="rounded-2xl border bg-card p-4">
            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Support / blocker</p>
            <p className="mt-2 text-sm">{String(task.supportDescription || "None")}</p>
            {task.blocker ? <p className="mt-2 text-sm text-red-700">{String(task.blocker)}</p> : null}
          </div>
        </div>
        <div className="mt-6 rounded-2xl border bg-card p-5">
          <h2 className="mb-3 text-sm font-semibold tracking-wide uppercase">Activity timeline</h2>
          <div className="space-y-4">
            {((data as { activities: Array<Record<string, unknown>> }).activities ?? []).map((activity) => (
              <div key={String(activity.id)} className="relative border-l pl-4">
                <p className="text-sm">{String(activity.message)}</p>
                <p className="text-xs text-muted-foreground">
                  {(activity.userId as { name?: string })?.name} · {String(activity.type).replaceAll("_", " ")}
                  {activity.previousProgress != null ? ` · ${activity.previousProgress}% → ${activity.newProgress}%` : ""}
                </p>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-6 rounded-2xl border bg-card p-5">
          <h2 className="mb-3 text-sm font-semibold tracking-wide uppercase">Comments</h2>
          <CommentThread
            targetType="TASK"
            targetId={id}
            comments={(data as { comments: never }).comments}
          />
        </div>
      </div>
      {canEdit ? (
        <div className="rounded-2xl border bg-card p-5">
          <h2 className="mb-3 text-sm font-semibold tracking-wide uppercase">Quick update</h2>
          <QuickUpdateForm
            taskId={id}
            progress={Number(task.progress)}
            status={String(task.status) as TaskStatus}
          />
        </div>
      ) : null}
    </div>
  );
}

function Block({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-2xl border bg-card p-4">
      <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{title}</p>
      <ul className="mt-2 list-disc pl-4 text-sm">
        {items.filter(Boolean).map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
