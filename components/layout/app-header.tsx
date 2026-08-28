"use client";

import { Search } from "lucide-react";

export function AppHeader() {
  return (
    <header className="z-20 flex h-14 shrink-0 items-center justify-between gap-4 border-b border-border/70 bg-[oklch(0.975_0.006_250)] px-6 lg:px-8">
      <p className="text-sm text-muted-foreground">Calls: Tue & Fri · 3:30 PM EAT · 8:30 AM ET</p>
      <button
        type="button"
        onClick={() => window.dispatchEvent(new Event("workplan:search"))}
        className="flex h-8 items-center gap-2 rounded-lg border bg-card px-3 text-xs text-muted-foreground shadow-sm transition-colors hover:border-primary/30 hover:text-foreground"
      >
        <Search className="size-3.5" />
        Search
        <kbd className="ml-4 hidden rounded border bg-muted px-1.5 py-0.5 text-[10px] sm:inline">⌘K</kbd>
      </button>
    </header>
  );
}
