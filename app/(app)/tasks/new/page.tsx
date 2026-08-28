import { requireUser } from "@/lib/session";
import { canAssignWork } from "@/lib/permissions";
import { getProjectsForUser, getUsers } from "@/lib/queries";
import { connectDB } from "@/lib/db";
import { Deliverable } from "@/models/Deliverable";
import { serialize } from "@/lib/serialize";
import { PageHeader } from "@/components/work-ui";
import { TaskForm } from "@/components/forms";

export default async function NewTaskPage() {
  const user = await requireUser();
  const [users, projects] = await Promise.all([getUsers(), getProjectsForUser(user)]);
  await connectDB();
  const deliverables = serialize(await Deliverable.find().select("name projectId").lean()) as Array<{
    id: string;
    name: string;
    projectId: string;
  }>;

  return (
    <div className="max-w-xl">
      <PageHeader title="Assign a piece" description="Mike sets the focus and assigns each person their work. They update status from My status." />
      <div className="rounded-2xl border bg-card p-5">
        <TaskForm
          users={users as Array<{ id: string; name: string }>}
          projects={projects as Array<{ id: string; name: string }>}
          deliverables={deliverables}
          defaultAssignee={canAssignWork(user) ? undefined : user.id}
        />
      </div>
    </div>
  );
}
