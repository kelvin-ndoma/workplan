"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createUserAction, inviteTeamAction, inviteUserAction, updateUserAction } from "@/app/actions/work";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ROLE_LABELS, ROLES, type Role } from "@/types";

export function UserRoleSelect({
  userId,
  role,
}: {
  userId: string;
  role: Role;
}) {
  const [pending, startTransition] = useTransition();
  const [current, setCurrent] = useState(role);

  useEffect(() => {
    setCurrent(role);
  }, [role]);

  return (
    <select
      value={current}
      disabled={pending}
      aria-label="Role"
      className="h-8 shrink-0 rounded-lg border bg-background px-2 text-sm disabled:opacity-60"
      onChange={(event) => {
        const next = event.target.value as Role;
        if (next === current) return;
        const previous = current;
        setCurrent(next);
        startTransition(async () => {
          const result = await updateUserAction(userId, { role: next });
          if (result && "error" in result && result.error) {
            setCurrent(previous);
            toast.error(result.error);
            return;
          }
          toast.success(`Role updated to ${ROLE_LABELS[next]}.`);
        });
      }}
    >
      {ROLES.map((option) => (
        <option key={option} value={option}>
          {ROLE_LABELS[option]}
        </option>
      ))}
    </select>
  );
}

export function InviteTeammateForm({ emailConfigured }: { emailConfigured: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const formEl = event.currentTarget;
        startTransition(async () => {
          const result = await createUserAction({
            name: String(form.get("name")),
            email: String(form.get("email")),
            role: String(form.get("role")),
            jobTitle: String(form.get("jobTitle") || ""),
          });
          if (result && "error" in result && result.error && !("id" in result && result.id)) {
            toast.error(result.error);
            return;
          }
          if (result && "error" in result && result.error) {
            toast.error(result.error);
          } else {
            toast.success(
              result && "invited" in result && result.invited
                ? "Invite sent. They have 24 hours to set a password."
                : "Teammate added.",
            );
          }
          formEl.reset();
          router.refresh();
        });
      }}
    >
      <div>
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" required className="mt-1" autoComplete="name" />
      </div>
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required className="mt-1" autoComplete="email" />
      </div>
      <div>
        <Label htmlFor="jobTitle">Job title</Label>
        <Input id="jobTitle" name="jobTitle" className="mt-1" placeholder="Optional" />
      </div>
      <div>
        <Label htmlFor="role">Role</Label>
        <select
          id="role"
          name="role"
          defaultValue="TEAM_MEMBER"
          className="mt-1 h-8 w-full rounded-lg border bg-background px-2 text-sm"
        >
          {ROLES.map((role) => (
            <option key={role} value={role}>
              {ROLE_LABELS[role]}
            </option>
          ))}
        </select>
      </div>
      <Button type="submit" disabled={pending} className="mt-1 w-full">
        {pending ? "Sending…" : "Send invite"}
      </Button>
      {!emailConfigured ? (
        <p className="text-xs text-amber-800">
          Email is not configured, so we cannot send invites yet. Add RESEND_API_KEY in .env.local.
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          They get an email to set a password. The link expires in 24 hours.
        </p>
      )}
    </form>
  );
}

export function SendInviteButton({ userId, email }: { userId: string; email: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          const result = await inviteUserAction(userId);
          if (result && "error" in result && result.error) {
            toast.error(result.error);
            return;
          }
          toast.success(`Invite sent to ${email}.`);
          router.refresh();
        });
      }}
    >
      {pending ? "Sending…" : "Send invite"}
    </Button>
  );
}

export function InviteTeamButton({ count }: { count: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={pending || count < 1}
      onClick={() => {
        startTransition(async () => {
          const result = await inviteTeamAction();
          if (result && "error" in result && result.error) {
            toast.error(result.error);
            return;
          }
          if (result && "ok" in result && result.ok) {
            toast.success(
              result.failed
                ? `Sent ${result.sent} invite${result.sent === 1 ? "" : "s"}. ${result.failed} did not send.`
                : `Sent ${result.sent} invite${result.sent === 1 ? "" : "s"}.`,
            );
          }
          router.refresh();
        });
      }}
    >
      {pending ? "Sending…" : `Email the team (${count})`}
    </Button>
  );
}
