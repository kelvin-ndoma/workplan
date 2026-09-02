"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, Search, X } from "lucide-react";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { CommandPalette } from "@/components/command-palette";
import type { Role } from "@/types";

export function AppShell({
  user,
  unread,
  children,
}: {
  user: { name: string; email: string; role: Role; jobTitle?: string; avatar?: string };
  unread: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!navOpen) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setNavOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navOpen]);

  return (
    <div className="flex h-dvh overflow-hidden bg-[oklch(0.975_0.006_250)]">
      {navOpen ? (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setNavOpen(false)}
        />
      ) : null}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-[min(16.5rem,88vw)] transform transition-transform duration-200 lg:static lg:z-auto lg:w-60 lg:translate-x-0 xl:w-64 ${
          navOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <AppSidebar user={user} unread={unread} />
      </div>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="z-20 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border/70 bg-[oklch(0.975_0.006_250)] px-3 sm:px-5 lg:px-8 xl:px-10">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              className="inline-flex size-9 items-center justify-center rounded-lg border bg-card text-foreground lg:hidden"
              aria-label={navOpen ? "Close menu" : "Open menu"}
              onClick={() => setNavOpen((open) => !open)}
            >
              {navOpen ? <X className="size-4" /> : <Menu className="size-4" />}
            </button>
            <p className="truncate text-xs text-muted-foreground sm:text-sm">
              <span className="sm:hidden">Tue & Fri · 3:30 PM EAT</span>
              <span className="hidden sm:inline">Calls: Tue & Fri · 3:30 PM EAT · 8:30 AM ET</span>
            </p>
          </div>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event("workplan:search"))}
            className="flex h-8 shrink-0 items-center gap-2 rounded-lg border bg-card px-2.5 text-xs text-muted-foreground shadow-sm transition-colors hover:border-primary/30 hover:text-foreground sm:px-3"
          >
            <Search className="size-3.5" />
            <span className="hidden sm:inline">Search</span>
            <kbd className="ml-1 hidden rounded border bg-muted px-1.5 py-0.5 text-[10px] md:inline">⌘K</kbd>
          </button>
        </header>
        <CommandPalette />
        <main className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-5 sm:py-6 lg:px-8 lg:py-8 xl:px-10 2xl:px-12">
          <div className="mx-auto w-full max-w-6xl xl:max-w-[90rem] 2xl:max-w-[110rem]">{children}</div>
        </main>
      </div>
    </div>
  );
}
