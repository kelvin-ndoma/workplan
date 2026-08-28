"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { saveMonthFocusAction } from "@/app/actions/focus";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function MonthFocusForm({ month, summary }: { month: string; summary: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        startTransition(async () => {
          await saveMonthFocusAction({ month, summary: String(form.get("summary") ?? "") });
          toast.success("Month focus saved");
          router.refresh();
        });
      }}
    >
      <Label htmlFor="summary">This month’s focus</Label>
      <Textarea
        id="summary"
        name="summary"
        rows={4}
        defaultValue={summary}
        placeholder="What the team should hit this month. Mike sets this; everyone else executes."
      />
      <Button type="submit" disabled={pending} className="w-fit">
        {pending ? "Saving…" : "Save focus"}
      </Button>
    </form>
  );
}
