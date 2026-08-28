"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { sendCallRemindersAction } from "@/app/actions/focus";
import { Button } from "@/components/ui/button";

export function ReminderButton({
  nextLabel,
  emailConfigured,
}: {
  nextLabel: string;
  emailConfigured: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          const result = await sendCallRemindersAction({ force: true });
          if (result && "error" in result && result.error) {
            toast.error(result.error);
            return;
          }
          if (result && "ok" in result && result.ok) {
            toast.success(
              emailConfigured
                ? `Reminder emailed to ${result.emailed} people for ${nextLabel}.`
                : `In-app reminder sent. Add RESEND_API_KEY in .env.local to also email the team.`,
            );
          }
        });
      }}
    >
      {pending ? "Sending…" : "Send call reminder"}
    </Button>
  );
}
