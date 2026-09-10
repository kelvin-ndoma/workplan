import Link from "next/link";
import { requireUser } from "@/lib/session";
import { getMonthFocus, getProjectsForUser } from "@/lib/queries";
import { canAssignWork, canCreateProjects } from "@/lib/permissions";
import { currentWorkPlanMonth, formatMonthLabel } from "@/lib/dates";
import { PageHeader, ProgressBar, StatusBadge } from "@/components/work-ui";
import { Button } from "@/components/ui/button";
import { MonthLinkBar } from "@/components/layout/topbar";
import { MonthFocusForm } from "@/components/focus/month-focus-form";

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const user = await requireUser();
  const { month: monthParam } = await searchParams;
  const month = monthParam || currentWorkPlanMonth();
  const [projects, focus] = await Promise.all([getProjectsForUser(user), getMonthFocus(month)]);
  const list = projects as Array<Record<string, unknown>>;
  const focusDoc = focus as { summary?: string; setBy?: { name?: string }; updatedAt?: string } | null;
  const canEditFocus = user.role === "ADMIN";

  return (
    <div>
      <PageHeader
        title="Projects"
        description="Workstreams and this month’s focus. Deliverables and tasks live inside each project."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {canAssignWork(user) ? (
              <Button variant="outline" render={<Link href="/tasks/new" />}>
                Assign a task
              </Button>
            ) : null}
            {canCreateProjects(user) ? (
              <Button render={<Link href="/projects/new" />}>New project</Button>
            ) : null}
          </div>
        }
      />

      <section className="mb-8 rounded-2xl border bg-card p-5">
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {formatMonthLabel(month)} focus
          </p>
          <MonthLinkBar month={month} pathname="/projects" />
        </div>
        {canEditFocus ? (
          <div className="mt-3">
            <MonthFocusForm
              month={month}
              summary={String(focusDoc?.summary ?? "")}
              setByName={focusDoc?.setBy?.name}
              updatedAt={focusDoc?.updatedAt}
            />
          </div>
        ) : (
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">
            {focusDoc?.summary?.trim()
              ? focusDoc.summary
              : "No focus set yet. An admin will add it here."}
          </p>
        )}
      </section>

      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {list.map((project) => (
          <Link
            key={String(project.id)}
            href={`/projects/${project.id}`}
            className="rounded-2xl border bg-card p-5 transition-colors hover:border-primary/25"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className="size-3 shrink-0 rounded-full"
                  style={{ background: String(project.color || "#2563eb") }}
                />
                <h2 className="truncate text-lg font-semibold">{String(project.name)}</h2>
              </div>
              <StatusBadge value={String(project.status)} />
            </div>
            <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
              {String(project.description || "")}
            </p>
            <div className="mt-4 flex items-center gap-3">
              <ProgressBar value={Number(project.progress)} className="flex-1" />
              <span className="text-sm font-semibold tabular-nums">{Number(project.progress)}%</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
