import { requireUser } from "@/lib/session";
import { canCreateProjects } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { getUsers } from "@/lib/queries";
import { PageHeader } from "@/components/work-ui";
import { ProjectForm } from "@/components/forms";

export default async function NewProjectPage() {
  const user = await requireUser();
  if (!canCreateProjects(user)) redirect("/projects");
  const users = (await getUsers()) as Array<{ id: string; name: string }>;
  return (
    <div className="max-w-xl">
      <PageHeader title="New project" description="Create a project the monthly work plan can roll up into." />
      <div className="rounded-2xl border bg-card p-5">
        <ProjectForm users={users} />
      </div>
    </div>
  );
}
