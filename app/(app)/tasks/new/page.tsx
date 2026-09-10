import { requireRole } from "@/lib/session";
import { getProjectsForUser, getUsers } from "@/lib/queries";
import { connectDB } from "@/lib/db";
import { Deliverable } from "@/models/Deliverable";
import { serialize } from "@/lib/serialize";
import { PageHeader } from "@/components/work-ui";
import { AssignWorkspace } from "@/components/tasks/assign-workspace";

export default async function NewTaskPage({
  searchParams,
}: {
  searchParams: Promise<{ to?: string; project?: string }>;
}) {
  const user = await requireRole(["ADMIN"]);
  const { to, project } = await searchParams;
  const [users, projects] = await Promise.all([getUsers(), getProjectsForUser(user)]);
  await connectDB();
  const deliverables = serialize(await Deliverable.find().select("name projectId").lean()) as Array<{
    id: string;
    name: string;
    projectId: string;
  }>;

  return (
    <div>
      <PageHeader
        title="Assign a task"
        description="Write the goal on the left. Pick or add a project on the right."
      />
      <AssignWorkspace
        users={users as Array<{ id: string; name: string }>}
        projects={
          projects as Array<{ id: string; name: string; color?: string; progress?: number; description?: string }>
        }
        deliverables={deliverables}
        defaultAssignee={to}
        currentUserId={user.id}
        defaultProjectId={project}
        stayOnPage
        key={(projects as Array<{ id: string }>).map((item) => item.id).join(",") || "none"}
      />
    </div>
  );
}
