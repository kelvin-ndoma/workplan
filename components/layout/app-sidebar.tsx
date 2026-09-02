"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  CalendarDays,
  ClipboardList,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Mail,
  Presentation,
  ScrollText,
  Settings,
  Shield,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { logoutAction } from "@/app/actions/auth";
import { UserAvatar } from "@/components/work-ui";
import type { Role } from "@/types";

const groups = [
  {
    label: "Work",
    items: [
      { href: "/my-work", label: "My status", icon: ClipboardList, roles: ["ADMIN", "MANAGER", "TEAM_MEMBER"] },
      { href: "/team", label: "Team", icon: Users, roles: ["ADMIN", "MANAGER", "TEAM_MEMBER"] },
      { href: "/brief", label: "Share screen", icon: Presentation, roles: ["ADMIN", "MANAGER", "TEAM_MEMBER"] },
      { href: "/calendar", label: "Calendar", icon: CalendarDays, roles: ["ADMIN", "MANAGER", "TEAM_MEMBER"] },
      { href: "/communication", label: "Communication", icon: Mail, roles: ["ADMIN", "MANAGER", "TEAM_MEMBER"] },
      { href: "/leadership", label: "Focus", icon: LayoutDashboard, roles: ["ADMIN"] },
      { href: "/projects", label: "Projects", icon: FolderKanban, roles: ["ADMIN", "MANAGER", "TEAM_MEMBER"] },
    ],
  },
  {
    label: "More",
    items: [
      { href: "/reports", label: "Reports", icon: ScrollText, roles: ["ADMIN", "MANAGER", "TEAM_MEMBER"] },
      { href: "/notifications", label: "Notifications", icon: Bell, roles: ["ADMIN", "MANAGER", "TEAM_MEMBER"] },
      { href: "/settings", label: "Settings", icon: Settings, roles: ["ADMIN", "MANAGER", "TEAM_MEMBER"] },
      { href: "/admin", label: "Admin", icon: Shield, roles: ["ADMIN"] },
    ],
  },
];

export function AppSidebar({
  user,
  unread,
}: {
  user: { name: string; email: string; role: Role; jobTitle?: string; avatar?: string };
  unread: number;
}) {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-full shrink-0 flex-col overflow-y-auto bg-[oklch(0.205_0.035_255)] text-white">
      <div className="px-5 pt-6 pb-4">
        <Link href="/" className="block">
          <p className="text-lg font-semibold tracking-tight">WorkPlan</p>
          <p className="mt-1 text-[11px] text-white/50">TBB Africa</p>
        </Link>
      </div>
      <nav className="flex-1 space-y-5 px-3 pb-4">
        {groups.map((group) => {
          const items = group.items.filter((item) => item.roles.includes(user.role));
          if (items.length === 0) return null;
          return (
            <div key={group.label}>
              <p className="mb-1.5 px-3 text-[10px] font-medium tracking-[0.16em] text-white/35 uppercase">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {items.map((item) => {
                  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors",
                        active ? "bg-white/12 text-white" : "text-white/68 hover:bg-white/8 hover:text-white",
                      )}
                    >
                      <Icon className="size-4 opacity-80" />
                      <span className="flex-1">{item.label}</span>
                      {item.href === "/notifications" && unread > 0 ? (
                        <span className="rounded-full bg-red-500 px-1.5 text-[10px] font-semibold">{unread}</span>
                      ) : null}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>
      <div className="mt-auto border-t border-white/10 p-4">
        <div className="flex items-center gap-3">
          <UserAvatar name={user.name} src={user.avatar} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{user.name}</p>
            <p className="truncate text-[11px] text-white/50">{user.jobTitle || user.role}</p>
          </div>
          <form action={logoutAction}>
            <button
              type="submit"
              className="rounded-md p-1.5 text-white/55 hover:bg-white/10 hover:text-white"
              title="Sign out"
            >
              <LogOut className="size-4" />
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
