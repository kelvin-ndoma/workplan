import { requireRole } from "@/lib/session";
import { getAdminTeam } from "@/lib/queries";
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
  invitePending?: boolean;
  passwordResetExpires?: string;
  needsInvite: boolean;
};

export default async function AdminPage() {
  const actor = await requireRole(["ADMIN"]);
  const emailConfigured = isEmailConfigured();
  const users = sortByBriefingOrder(
    (await getAdminTeam()) as TeamUser[],
    (user) => user.name,
  );
  const awaiting = users.filter((user) => user.id !== actor.id && user.needsInvite);
  const now = Date.now();

  return (
    <div>
      <PageHeader
        title="Team"
        description="Send invite on anyone who has not set their own password yet. People who already activated do not get another email."
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,22rem)_1fr] lg:items-start">
        <section className="rounded-2xl border bg-card p-5">
          <h2 className="text-sm font-semibold tracking-wide uppercase">Invite teammate</h2>
          <p className="mt-1 mb-4 text-sm text-muted-foreground">
            For someone who is not on the list yet. They get a 24-hour link to set a password and sign in.
          </p>
          <InviteTeammateForm emailConfigured={emailConfigured} />
        </section>
        <section className="rounded-2xl border bg-card p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold tracking-wide uppercase">People</h2>
            {awaiting.length > 0 ? <InviteTeamButton count={awaiting.length} /> : null}
          </div>
          <div className="space-y-2">
            {users.map((user) => {
              const inviteOpen =
                Boolean(user.invitePending) ||
                Boolean(user.passwordResetExpires && new Date(user.passwordResetExpires).getTime() > now);
              const expired =
                Boolean(user.invitePending) &&
                (!user.passwordResetExpires || new Date(user.passwordResetExpires).getTime() <= now);
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
                        {user.needsInvite
                          ? user.invitePending
                            ? expired
                              ? " · Invite expired"
                              : " · Invite sent — not activated yet"
                            : " · Needs to set a password"
                          : " · Active"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {user.id !== actor.id && user.needsInvite ? (
                      <SendInviteButton userId={user.id} email={user.email} pendingInvite={inviteOpen} />
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
