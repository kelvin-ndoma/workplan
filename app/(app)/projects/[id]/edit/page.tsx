import { requireUser } from "@/lib/session";
import { canCreateProjects } from "@/lib/permissions";
import { redirect, notFound } from "next/navigation";
import { getProjectDetail, getUsers } from "@/lib/queries";
import { PageHeader } from "@/components/work-ui";
import { ProjectForm } from "@/components/forms";

function asId(value: unknown) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object" && value && "id" in value) return String((value as { id: unknown }).id);
  return String(value);
}

function asDateInput(value?: unknown) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

export default async function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!canCreateProjects(user)) redirect("/projects");
  const { id } = await params;
  const data = await getProjectDetail(id);
  if (!data) notFound();
  const project = data.project as Record<string, unknown>;
  const users = (await getUsers()) as Array<{ id: string; name: string }>;
  const memberIds = Array.isArray(project.memberIds)
    ? (project.memberIds as unknown[]).map((member) => asId(member)).filter(Boolean)
    : [];

  return (
    <div className="max-w-xl">
      <PageHeader title="Edit project" description="Update this workstream. Saving keeps its tasks and deliverables." />
      <div className="rounded-2xl border bg-card p-5">
        <ProjectForm
          users={users}
          project={{
            id,
            name: String(project.name),
            description: String(project.description || ""),
            ownerId: asId(project.ownerId),
            memberIds,
            status: String(project.status || "ACTIVE"),
            priority: String(project.priority || "MEDIUM"),
            startDate: asDateInput(project.startDate),
            targetDate: asDateInput(project.targetDate),
            color: String(project.color || "#2563eb"),
          }}
        />
      </div>
    </div>
  );
}
