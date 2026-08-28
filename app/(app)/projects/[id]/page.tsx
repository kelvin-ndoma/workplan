import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { getProjectDetail, getUsers } from "@/lib/queries";
import { canCreateProjects } from "@/lib/permissions";
import { formatDateTime, formatShortDate } from "@/lib/dates";
import { PageHeader, ProgressBar, StatCard, StatusBadge, UserAvatar } from "@/components/work-ui";
import { CommentThread } from "@/components/comments";
import { DeliverableForm } from "@/components/forms";
import { connectDB } from "@/lib/db";
import { Comment } from "@/models/Comment";
import { serialize } from "@/lib/serialize";

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const data = await getProjectDetail(id);
  if (!data) notFound();
  const project = data.project as Record<string, unknown>;
  const users = (await getUsers()) as Array<{ id: string; name: string }>;
  await connectDB();
  const comments = serialize(
    await Comment.find({ targetType: "PROJECT", targetId: id })
      .populate("userId", "name avatar")
      .sort({ createdAt: -1 })
      .lean(),
  ) as never;

  return (
    <div>
      <PageHeader
        eyebrow="Project"
        title={String(project.name)}
        description={String(project.description || "")}
        actions={<StatusBadge value={String(project.status)} />}
      />
      <div className="mb-6 grid gap-3 sm:grid-cols-4">
        <StatCard label="Progress" value={`${Number(project.progress)}%`} />
        <StatCard label="Deliverables" value={(data.deliverables as unknown[]).length} />
        <StatCard label="Tasks" value={(data.summary as { total: number }).total} />
        <StatCard label="Blocked" value={(data.summary as { blocked: number }).blocked} tone="danger" />
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <div className="space-y-6">
          <section className="rounded-2xl border bg-card p-5">
            <h2 className="mb-4 text-sm font-semibold tracking-wide uppercase">Deliverables</h2>
            <div className="space-y-3">
              {(data.deliverables as Array<Record<string, unknown>>).map((item) => (
                <div key={String(item.id)}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="font-medium">{String(item.name)}</span>
                    <span>{Number(item.progress)}%</span>
                  </div>
                  <ProgressBar value={Number(item.progress)} />
                </div>
              ))}
            </div>
          </section>
          <section className="rounded-2xl border bg-card p-5">
            <h2 className="mb-4 text-sm font-semibold tracking-wide uppercase">Tasks</h2>
            <div className="space-y-2">
              {(data.tasks as Array<Record<string, unknown>>).map((task) => (
                <Link key={String(task.id)} href={`/tasks/${task.id}`} className="flex items-center justify-between rounded-xl border p-3">
                  <div>
                    <p className="font-medium">{String(task.title)}</p>
                    <p className="text-xs text-muted-foreground">
                      {(task.assignedTo as { name?: string })?.name} · {formatShortDate(task.dueDate as string)}
                    </p>
                  </div>
                  <StatusBadge value={String(task.status)} />
                </Link>
              ))}
            </div>
          </section>
          <section className="rounded-2xl border bg-card p-5">
            <h2 className="mb-4 text-sm font-semibold tracking-wide uppercase">Comments</h2>
            <CommentThread targetType="PROJECT" targetId={id} comments={comments} />
          </section>
        </div>
        <div className="space-y-6">
          <section className="rounded-2xl border bg-card p-5">
            <h2 className="mb-3 text-sm font-semibold tracking-wide uppercase">Team</h2>
            <div className="space-y-2">
              {((project.memberIds as Array<{ id: string; name: string; jobTitle?: string; avatar?: string }>) ?? []).map((member) => (
                <div key={member.id} className="flex items-center gap-2">
                  <UserAvatar name={member.name} src={member.avatar} size="sm" />
                  <div>
                    <p className="text-sm font-medium">{member.name}</p>
                    <p className="text-xs text-muted-foreground">{member.jobTitle}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
          <section className="rounded-2xl border bg-card p-5">
            <h2 className="mb-3 text-sm font-semibold tracking-wide uppercase">Recent activity</h2>
            {(data.activities as Array<Record<string, unknown>>).map((activity) => (
              <div key={String(activity.id)} className="mb-3 text-sm">
                <p>{String(activity.message)}</p>
                <p className="text-xs text-muted-foreground">
                  {(activity.userId as { name?: string })?.name} · {formatDateTime(activity.createdAt as string)}
                </p>
              </div>
            ))}
          </section>
          {canCreateProjects(user) ? (
            <section className="rounded-2xl border bg-card p-5">
              <h2 className="mb-3 text-sm font-semibold tracking-wide uppercase">Add deliverable</h2>
              <DeliverableForm projectId={id} users={users} />
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
