import { requireRole } from "@/lib/session";
import { getUsers } from "@/lib/queries";
import { sortByBriefingOrder } from "@/lib/briefing";
import { isEmailConfigured } from "@/lib/email";
import { PageHeader, UserAvatar } from "@/components/work-ui";
import { InviteTeamButton, InviteTeammateForm, SendInviteButton, UserRoleSelect } from "@/components/admin/forms";
import type { Role } from "@/types";

type TeamUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  jobTitle?: string;
  passwordResetExpires?: string;
};

export default async function AdminPage() {
  const actor = await requireRole(["ADMIN"]);
  const emailConfigured = isEmailConfigured();
  const users = sortByBriefingOrder(
    (await getUsers()) as TeamUser[],
    (user) => user.name,
  );
  const inviteCount = users.filter((user) => user.id !== actor.id).length;
  const now = Date.now();

  return (
    <div>
      <PageHeader
        title="Team"
        description="Invite people by email. They set a password and then sign in."
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,22rem)_1fr] lg:items-start">
        <section className="rounded-2xl border bg-card p-5">
          <h2 className="text-sm font-semibold tracking-wide uppercase">Invite teammate</h2>
          <p className="mt-1 mb-4 text-sm text-muted-foreground">
            They will show up on My status, Team, and Share screen.
          </p>
          <InviteTeammateForm emailConfigured={emailConfigured} />
        </section>
        <section className="rounded-2xl border bg-card p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold tracking-wide uppercase">People</h2>
            <InviteTeamButton count={inviteCount} />
          </div>
          <div className="space-y-2">
            {users.map((user) => {
              const inviteOpen =
                user.passwordResetExpires && new Date(user.passwordResetExpires).getTime() > now;
              return (
                <div
                  key={user.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-sm"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <UserAvatar name={user.name} size="sm" />
                    <div className="min-w-0">
                      <p className="font-medium">{user.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {user.jobTitle ? `${user.jobTitle} · ` : ""}
                        {user.email}
                        {inviteOpen ? " · Invite sent" : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {user.id !== actor.id ? (
                      <SendInviteButton userId={user.id} email={user.email} />
                    ) : null}
                    <UserRoleSelect userId={user.id} role={user.role} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
