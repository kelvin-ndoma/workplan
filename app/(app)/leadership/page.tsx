import Link from "next/link";
import { requireRole } from "@/lib/session";
import { getLeadershipData, getMonthFocus, getProjectsForUser, getTeamDashboard, getUsers } from "@/lib/queries";
import { currentWorkPlanMonth, formatMonthLabel, formatShortDate } from "@/lib/dates";
import { format, formatDistanceToNow } from "date-fns";
import { meetingDayName, MEETING_TIME_LABEL, nextMeetingDate } from "@/lib/meetings/cadence";
import { isEmailConfigured } from "@/lib/email";
import { connectDB } from "@/lib/db";
import { Deliverable } from "@/models/Deliverable";
import { serialize } from "@/lib/serialize";
import { MonthLinkBar } from "@/components/layout/topbar";
import { PageHeader, ProgressBar, StatCard, StatusBadge, UserAvatar } from "@/components/work-ui";
import { Button } from "@/components/ui/button";
import { MonthFocusForm } from "@/components/focus/month-focus-form";
import { ReminderButton } from "@/components/focus/reminder-button";
import { TaskForm } from "@/components/forms";

export default async function LeadershipPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const user = await requireRole(["ADMIN"]);
  const { month: monthParam } = await searchParams;
  const month = monthParam || currentWorkPlanMonth();
  const [data, team, focus, users, projects] = await Promise.all([
    getLeadershipData(month),
    getTeamDashboard(month),
    getMonthFocus(month),
    getUsers(),
    getProjectsForUser(user),
  ]);
  await connectDB();
  const deliverables = serialize(await Deliverable.find().select("name projectId").lean()) as Array<{
    id: string;
    name: string;
    projectId: string;
  }>;
  const summary = data.summary as {
    progress: number;
    completed: number;
    inProgress: number;
    blocked: number;
    atRisk: number;
    overdue: number;
  };
  const next = nextMeetingDate();
  const nextLabel = `${meetingDayName(next)}, ${format(next, "MMM d")} · ${MEETING_TIME_LABEL}`;
  const emailOn = isEmailConfigured();
  const focusDoc = focus as { summary?: string; setBy?: { name?: string }; updatedAt?: string } | null;

  return (
    <div>
      <PageHeader
        title={`Focus · ${formatMonthLabel(month)}`}
        description="Set the month’s focus, assign each person their pieces, and remind the team before Tuesday and Friday calls."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <MonthLinkBar month={month} pathname="/leadership" />
            <ReminderButton nextLabel={nextLabel} emailConfigured={emailOn} />
            <Button render={<Link href="/brief" />}>Share screen</Button>
          </div>
        }
      />

      <div className="mb-4 rounded-xl border border-amber-100 bg-amber-50/70 px-4 py-3 text-sm">
        Next call: <span className="font-medium">{nextLabel}</span>
        {" · "}
        {emailOn
          ? "Assignment emails and call reminders will go to teammate inboxes."
          : "In-app alerts work now. Add RESEND_API_KEY in .env.local to also send email."}
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Team progress" value={`${summary.progress}%`} />
        <StatCard label="Completed" value={summary.completed} tone="success" />
        <StatCard label="In progress" value={summary.inProgress} tone="info" />
        <StatCard label="At risk" value={summary.atRisk} tone="warning" />
        <StatCard label="Blocked" value={summary.blocked} tone="danger" />
        <StatCard label="Overdue" value={summary.overdue} tone="danger" />
      </div>

      <div className="mb-6 grid gap-6 xl:grid-cols-[1fr_1fr]">
        <section className="rounded-xl border bg-card p-5">
          <MonthFocusForm month={month} summary={String(focusDoc?.summary ?? "")} />
          {focusDoc?.setBy?.name ? (
            <p className="mt-3 text-xs text-muted-foreground">
              Last set by {focusDoc.setBy.name}
              {focusDoc.updatedAt
                ? ` · ${formatDistanceToNow(new Date(focusDoc.updatedAt), { addSuffix: true })}`
                : ""}
            </p>
          ) : null}
        </section>
        <section className="rounded-xl border bg-card p-5">
          <h2 className="mb-3 text-sm font-medium">Assign a piece</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            They get it on My status, plus an email when mail is configured.
          </p>
          <TaskForm
            users={users as Array<{ id: string; name: string }>}
            projects={projects as Array<{ id: string; name: string }>}
            deliverables={deliverables}
            stayOnPage
            month={month}
          />
        </section>
      </div>

      <h2 className="mb-3 text-sm font-medium text-muted-foreground">Who has what this month</h2>
      <div className="mb-8 grid gap-4 md:grid-cols-2">
        {team.members.map((member) => {
          const person = member.user as { id: string; name: string; jobTitle?: string; avatar?: string };
          const tasks = member.tasks as Array<Record<string, unknown>>;
          return (
            <Link
              key={person.id}
              href={`/team/${person.id}?month=${month}`}
              className="rounded-xl border bg-card p-5 transition-colors hover:border-primary/25"
            >
              <div className="mb-3 flex items-center gap-3">
                <UserAvatar name={person.name} src={person.avatar} />
                <div className="min-w-0">
                  <p className="font-semibold">{person.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{person.jobTitle}</p>
                </div>
                <p className="ml-auto text-lg font-semibold tabular-nums">{member.summary.progress}%</p>
              </div>
              <ProgressBar value={member.summary.progress} className="mb-3" />
              {tasks.length === 0 ? (
                <p className="text-sm text-muted-foreground">No pieces assigned yet.</p>
              ) : (
                <ul className="space-y-2">
                  {tasks.slice(0, 6).map((task) => (
                    <li key={String(task.id)} className="flex items-center justify-between gap-2 text-sm">
                      <span className="truncate">{String(task.title)}</span>
                      <StatusBadge value={String(task.status)} />
                    </li>
                  ))}
                </ul>
              )}
            </Link>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Blocked" items={data.blocked as Array<Record<string, unknown>>} />
        <Panel title="At risk" items={data.atRisk as Array<Record<string, unknown>>} />
        <div className="rounded-xl border bg-card p-5">
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">Upcoming deadlines</h2>
          <div className="space-y-3">
            {(data.upcoming as Array<Record<string, unknown>>).map((task) => (
              <Link key={String(task.id)} href={`/tasks/${task.id}`} className="block text-sm">
                <p className="font-medium">{String(task.title)}</p>
                <p className="text-xs text-muted-foreground">{formatShortDate(task.dueDate as string)}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Panel({ title, items }: { title: string; items: Array<Record<string, unknown>> }) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <h2 className="mb-3 text-sm font-medium text-muted-foreground">{title}</h2>
      <div className="space-y-3">
        {items.slice(0, 6).map((task) => (
          <Link key={String(task.id)} href={`/tasks/${task.id}`} className="block">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">{String(task.title)}</p>
              <StatusBadge value={String(task.status)} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
