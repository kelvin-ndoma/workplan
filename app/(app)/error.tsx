"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="rounded-2xl border bg-card p-8">
      <h1 className="text-lg font-semibold">Something went wrong</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {error.message || "The page failed to load. Try signing in again."}
      </p>
      <div className="mt-4 flex gap-2">
        <Button onClick={() => reset()}>Try again</Button>
        <Button variant="outline" render={<a href="/login" />}>
          Sign in
        </Button>
      </div>
    </div>
  );
}
