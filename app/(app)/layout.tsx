import { requireUser } from "@/lib/session";
import { getUnreadCount } from "@/lib/queries";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";
import { CommandPalette } from "@/components/command-palette";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const unread = await getUnreadCount(user.id);

  return (
    <div className="flex h-dvh overflow-hidden bg-[oklch(0.975_0.006_250)]">
      <AppSidebar user={user} unread={unread} />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <AppHeader />
        <CommandPalette />
        <main className="min-h-0 flex-1 overflow-y-auto px-6 py-6 lg:px-8 lg:py-8">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
