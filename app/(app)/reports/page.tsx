import { requireUser } from "@/lib/session";
import { canViewAllWork } from "@/lib/permissions";
import { getProjectsForUser, getUsers } from "@/lib/queries";
import { currentWorkPlanMonth, formatMonthLabel } from "@/lib/dates";
import { PageHeader } from "@/components/work-ui";
import { ReportsClient } from "@/components/reports/reports-client";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const user = await requireUser();
  const { month: monthParam } = await searchParams;
  const month = monthParam || currentWorkPlanMonth();
  const [users, projects] = await Promise.all([getUsers(), getProjectsForUser(user)]);

  return (
    <div>
      <PageHeader
        eyebrow="Reports"
        title={formatMonthLabel(month)}
        description="Export a Word-style report from live WorkPlan data. The document is not the source of truth."
      />
      <ReportsClient
        month={month}
        canViewAll={canViewAllWork(user)}
        currentUserId={user.id}
        users={users as Array<{ id: string; name: string }>}
        projects={projects as Array<{ id: string; name: string }>}
      />
    </div>
  );
}
