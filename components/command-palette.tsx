"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

type Results = {
  users: Array<{ id: string; name: string }>;
  projects: Array<{ id: string; name: string }>;
  deliverables: Array<{ id: string; name: string }>;
  tasks: Array<{ id: string; title: string }>;
  meetings: Array<{ id: string; title: string }>;
};

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Results | null>(null);
  const [, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };
    const openSearch = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("workplan:search", openSearch);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("workplan:search", openSearch);
    };
  }, []);

  useEffect(() => {
    if (!open || query.trim().length < 2) return;
    const handle = window.setTimeout(async () => {
      const response = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`);
      setResults(await response.json());
    }, 180);
    return () => window.clearTimeout(handle);
  }, [open, query]);

  function go(href: string) {
    setOpen(false);
    startTransition(() => router.push(href));
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen} title="Search WorkPlan">
      <CommandInput placeholder="Search people, projects, status…" value={query} onValueChange={setQuery} />
      <CommandList>
        <CommandEmpty>No results. Try a name or project.</CommandEmpty>
        <CommandGroup heading="Go">
          <CommandItem onSelect={() => go("/my-work")}>My status</CommandItem>
          <CommandItem onSelect={() => go("/team")}>Team</CommandItem>
          <CommandItem onSelect={() => go("/brief")}>Share screen</CommandItem>
          <CommandItem onSelect={() => go("/calendar")}>Calendar</CommandItem>
          <CommandItem onSelect={() => go("/communication")}>Communication</CommandItem>
          <CommandItem onSelect={() => go("/reports")}>Reports</CommandItem>
        </CommandGroup>
        {query.trim().length >= 2 && results?.users?.length ? (
          <CommandGroup heading="People">
            {results.users.map((item) => (
              <CommandItem key={item.id} onSelect={() => go(`/team/${item.id}`)}>
                {item.name}
              </CommandItem>
            ))}
          </CommandGroup>
        ) : null}
        {query.trim().length >= 2 && results?.projects?.length ? (
          <CommandGroup heading="Projects">
            {results.projects.map((item) => (
              <CommandItem key={item.id} onSelect={() => go(`/projects/${item.id}`)}>
                {item.name}
              </CommandItem>
            ))}
          </CommandGroup>
        ) : null}
        {query.trim().length >= 2 && results?.tasks?.length ? (
          <CommandGroup heading="Tasks">
            {results.tasks.map((item) => (
              <CommandItem key={item.id} onSelect={() => go(`/tasks/${item.id}`)}>
                {item.title}
              </CommandItem>
            ))}
          </CommandGroup>
        ) : null}
        {query.trim().length >= 2 && results?.meetings?.length ? (
          <CommandGroup heading="Meetings">
            {results.meetings.map((item) => (
              <CommandItem key={item.id} onSelect={() => go(`/meetings/${item.id}`)}>
                {item.title}
              </CommandItem>
            ))}
          </CommandGroup>
        ) : null}
      </CommandList>
    </CommandDialog>
  );
}
