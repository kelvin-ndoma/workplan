"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { resetPasswordAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ResetPasswordForm({ token }: { token?: string }) {
  const [pending, startTransition] = useTransition();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  if (!token) {
    return (
      <div className="mt-6 space-y-4">
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          This reset link is missing or invalid. Request a new one.
        </p>
        <Button className="w-full" render={<Link href="/forgot-password" />}>
          Request a new link
        </Button>
      </div>
    );
  }

  return (
    <form
      className="mt-6 space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        setError("");
        startTransition(async () => {
          const result = await resetPasswordAction(form);
          if (result?.error) setError(result.error);
        });
      }}
    >
      <input type="hidden" name="token" value={token} />
      {error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : null}
      <div>
        <Label htmlFor="password">New password</Label>
        <div className="relative mt-1">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            required
            minLength={10}
            className="pr-9"
          />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            className="absolute inset-y-0 right-0 flex w-9 items-center justify-center text-muted-foreground hover:text-foreground"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </div>
      <div>
        <Label htmlFor="confirm">Confirm password</Label>
        <Input
          id="confirm"
          name="confirm"
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          required
          minLength={10}
          className="mt-1"
        />
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Saving…" : "Set new password"}
      </Button>
      <Button variant="outline" className="w-full" render={<Link href="/login" />}>
        Back to sign in
      </Button>
    </form>
  );
}
