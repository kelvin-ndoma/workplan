"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { requestPasswordResetAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ForgotPasswordForm({ defaultEmail }: { defaultEmail?: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  return (
    <form
      className="mt-6 space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        setError("");
        startTransition(async () => {
          const result = await requestPasswordResetAction(form);
          if (result?.error) {
            setError(result.error);
            return;
          }
          setSent(true);
        });
      }}
    >
      {error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : null}
      {sent ? (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          If that account exists, we sent a reset link. Check your inbox.
        </p>
      ) : null}
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={defaultEmail}
          className="mt-1"
        />
      </div>
      <Button type="submit" className="w-full" disabled={pending || sent}>
        {pending ? "Sending…" : "Send reset link"}
      </Button>
      <Button variant="outline" className="w-full" render={<Link href="/login" />}>
        Back to sign in
      </Button>
    </form>
  );
}
