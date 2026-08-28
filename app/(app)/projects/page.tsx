import Link from "next/link";
import { requireUser } from "@/lib/session";
import { getProjectsForUser } from "@/lib/queries";
import { canCreateProjects } from "@/lib/permissions";
import { PageHeader, ProgressBar, StatusBadge } from "@/components/work-ui";
import { Button } from "@/components/ui/button";

export default async function ProjectsPage() {
  const user = await requireUser();
  const projects = (await getProjectsForUser(user)) as Array<Record<string, unknown>>;

  return (
    <div>
      <PageHeader
        title="Projects"
        description="Workstreams that roll into Tuesday and Friday brief-outs."
        actions={
          canCreateProjects(user) ? (
            <Button render={<Link href="/projects/new" />}>New project</Button>
          ) : null
        }
      />
      <div className="grid gap-4 md:grid-cols-2">
        {projects.map((project) => (
          <Link key={String(project.id)} href={`/projects/${project.id}`} className="rounded-xl border bg-card p-5 transition-colors hover:border-primary/25">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="size-3 rounded-full" style={{ background: String(project.color || "#2563eb") }} />
                <h2 className="text-lg font-semibold">{String(project.name)}</h2>
              </div>
              <StatusBadge value={String(project.status)} />
            </div>
            <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{String(project.description || "")}</p>
            <div className="mt-4 flex items-center gap-3">
              <ProgressBar value={Number(project.progress)} className="flex-1" />
              <span className="text-sm font-semibold">{Number(project.progress)}%</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
