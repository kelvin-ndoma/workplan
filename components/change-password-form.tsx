"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";
import { changePasswordAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ChangePasswordForm() {
  const [pending, startTransition] = useTransition();
  const [show, setShow] = useState(false);

  return (
    <form
      className="space-y-4 rounded-2xl border bg-card p-5"
      onSubmit={(event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const data = new FormData(form);
        startTransition(async () => {
          const result = await changePasswordAction(data);
          if (result?.error) {
            toast.error(result.error);
            return;
          }
          toast.success("Password updated.");
          form.reset();
        });
      }}
    >
      <p className="text-sm font-semibold">Password</p>
      <div>
        <Label htmlFor="current">Current password</Label>
        <Input
          id="current"
          name="current"
          type={show ? "text" : "password"}
          autoComplete="current-password"
          required
          className="mt-1"
        />
      </div>
      <div>
        <Label htmlFor="password">New password</Label>
        <div className="relative mt-1">
          <Input
            id="password"
            name="password"
            type={show ? "text" : "password"}
            autoComplete="new-password"
            required
            minLength={8}
            className="pr-9"
          />
          <button
            type="button"
            onClick={() => setShow((value) => !value)}
            className="absolute inset-y-0 right-0 flex w-9 items-center justify-center text-muted-foreground hover:text-foreground"
            aria-label={show ? "Hide password" : "Show password"}
          >
            {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </div>
      <div>
        <Label htmlFor="confirm">Confirm new password</Label>
        <Input
          id="confirm"
          name="confirm"
          type={show ? "text" : "password"}
          autoComplete="new-password"
          required
          minLength={8}
          className="mt-1"
        />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Update password"}
      </Button>
    </form>
  );
}
