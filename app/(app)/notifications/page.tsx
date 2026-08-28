import { requireUser } from "@/lib/session";
import { getNotifications } from "@/lib/queries";
import { markNotificationsReadAction } from "@/app/actions/work";
import { formatDateTime } from "@/lib/dates";
import { PageHeader } from "@/components/work-ui";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function NotificationsPage() {
  const user = await requireUser();
  const items = (await getNotifications(user.id)) as Array<Record<string, unknown>>;

  return (
    <div>
      <PageHeader
        title="Notifications"
        description="Alerts for assignments, comments, blockers, and Tuesday/Friday meetings."
        actions={
          <form action={markNotificationsReadAction}>
            <Button type="submit" variant="outline">
              Mark all read
            </Button>
          </form>
        }
      />
      <div className="space-y-2">
        {items.map((item) => (
          <Link
            key={String(item.id)}
            href={String(item.link || "/")}
            className={`block rounded-xl border p-4 ${item.read ? "bg-card" : "bg-blue-50/60"}`}
          >
            <p className="font-medium">{String(item.title)}</p>
            <p className="text-sm text-muted-foreground">{String(item.message)}</p>
            <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(item.createdAt as string)}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
