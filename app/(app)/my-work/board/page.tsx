import { requireUser } from "@/lib/session";
import { getMyWorkData } from "@/lib/queries";
import { currentWorkPlanMonth } from "@/lib/dates";
import { PageHeader } from "@/components/work-ui";
import { KanbanBoard } from "@/components/tasks/kanban";

export default async function BoardPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const user = await requireUser();
  const { month: monthParam } = await searchParams;
  const month = monthParam || currentWorkPlanMonth();
  const data = await getMyWorkData(user.id, month);

  return (
    <div>
      <PageHeader
        eyebrow="My Work"
        title="Board"
        description="Drag a card to change status. Changes are saved immediately."
      />
      <KanbanBoard tasks={data.tasks as never} />
    </div>
  );
}
