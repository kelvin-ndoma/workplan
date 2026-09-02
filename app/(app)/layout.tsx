import { requireUser } from "@/lib/session";
import { getUnreadCount } from "@/lib/queries";
import { AppShell } from "@/components/layout/app-shell";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const unread = await getUnreadCount(user.id);

  return (
    <AppShell user={user} unread={unread}>
      {children}
    </AppShell>
  );
}
