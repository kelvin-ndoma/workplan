"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { sendUpdateStatusRemindersAction } from "@/app/actions/focus";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export function SendReminderForm({
  nextLabel,
  emailConfigured,
  recipientCount,
}: {
  nextLabel: string;
  emailConfigured: boolean;
  recipientCount: number;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        const note = String(new FormData(event.currentTarget).get("note") ?? "");
        startTransition(async () => {
          const result = await sendUpdateStatusRemindersAction({ note });
          if (result && "error" in result && result.error) {
            toast.error(result.error);
            return;
          }
          if (result && "ok" in result && result.ok) {
            if (!result.emailConfigured) {
              toast.success(`In-app reminder sent to ${result.notified} people. Add RESEND_API_KEY to also email.`);
              return;
            }
            toast.success(`Emailed ${result.emailed} of ${result.notified} people to update status for ${nextLabel}.`);
          }
        });
      }}
    >
      <div>
        <Label htmlFor="note">Optional note</Label>
        <Textarea
          id="note"
          name="note"
          rows={3}
          className="mt-1"
          placeholder="Please have Friday’s status in before 3:00 PM EAT."
        />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Sending…" : `Email the team (${recipientCount})`}
      </Button>
      {!emailConfigured ? (
        <p className="text-sm text-amber-800">
          Email is not configured yet. The team will still get an in-app notification. Add RESEND_API_KEY in
          .env.local to send mail.
        </p>
      ) : null}
    </form>
  );
}
