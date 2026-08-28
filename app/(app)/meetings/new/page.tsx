import { requireUser } from "@/lib/session";
import { isLeadership } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { getProjectsForUser, getUsers } from "@/lib/queries";
import { PageHeader } from "@/components/work-ui";
import { MeetingForm } from "@/components/meetings/forms";

export default async function NewMeetingPage() {
  const user = await requireUser();
  if (!isLeadership(user)) redirect("/meetings");
  const [users, projects] = await Promise.all([getUsers(), getProjectsForUser(user)]);
  return (
    <div className="max-w-xl">
      <PageHeader
        title="New meeting"
        description="Tuesdays and Fridays. The presentation is generated from live WorkPlan data."
      />
      <div className="rounded-xl border bg-card p-5">
        <MeetingForm
          users={users as Array<{ id: string; name: string }>}
          projects={projects as Array<{ id: string; name: string }>}
        />
      </div>
    </div>
  );
}
