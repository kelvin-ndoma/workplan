import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { isLeadership } from "@/lib/permissions";
import { getPresentationData } from "@/lib/meetings/presentation";
import { PresentationDeck } from "@/components/meetings/presentation";
import type { PresentationMode } from "@/types";

export const dynamic = "force-dynamic";

export default async function PresentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mode?: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const { mode: modeParam } = await searchParams;
  const data = await getPresentationData(id);
  if (!data) notFound();

  const requested = (modeParam === "host" || modeParam === "presenter" || modeParam === "audience"
    ? modeParam
    : isLeadership(user)
      ? "host"
      : "audience") as PresentationMode;
  const mode = requested === "host" && !isLeadership(user) ? "audience" : requested;

  return (
    <PresentationDeck
      data={data as never}
      mode={mode}
      canHost={isLeadership(user)}
      projects={(data.projects as Array<{ id: string; name: string }>) ?? []}
    />
  );
}
