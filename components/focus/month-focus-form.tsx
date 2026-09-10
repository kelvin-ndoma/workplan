"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { saveMonthFocusAction } from "@/app/actions/focus";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function MonthFocusForm({
  month,
  summary,
  setByName,
  updatedAt,
}: {
  month: string;
  summary: string;
  setByName?: string;
  updatedAt?: string;
}) {
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
      <Textarea
        id="summary"
        name="summary"
        rows={4}
        defaultValue={summary}
        placeholder="What the team should hit this month. Shown on everyone’s My status."
      />
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending} className="w-fit">
          {pending ? "Saving…" : "Save focus"}
        </Button>
        {setByName ? (
          <p className="text-xs text-muted-foreground">
            Last set by {setByName}
            {updatedAt ? ` · ${formatDistanceToNow(new Date(updatedAt), { addSuffix: true })}` : ""}
          </p>
        ) : null}
      </div>
    </form>
  );
}
