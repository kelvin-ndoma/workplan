import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/session";
import { writeAudit } from "@/lib/services/events";
import {
  WORKPACK_MAX_BYTES,
  buildTeamWorkpack,
  importTeamWorkpack,
  parseTeamWorkpack,
} from "@/lib/workpack";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const pack = await buildTeamWorkpack();
  await writeAudit({
    actorId: user.id,
    action: "WORKPACK_EXPORTED",
    entityType: "Workpack",
    details: {
      people: pack.people.length,
      projects: pack.projects.length,
      tasks: pack.tasks.length,
    },
  });

  const day = pack.exportedAt.slice(0, 10);
  return new NextResponse(JSON.stringify(pack, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="workplan-team-${day}.json"`,
      "Cache-Control": "no-store",
    },
  });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const length = Number(request.headers.get("content-length") ?? "0");
  if (length > WORKPACK_MAX_BYTES) {
    return NextResponse.json({ error: "That file is too large." }, { status: 413 });
  }

  let raw: unknown;
  const contentType = request.headers.get("content-type") ?? "";
  try {
    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const file = form.get("file");
      if (!(file instanceof File)) {
        return NextResponse.json({ error: "Choose a WorkPlan JSON file." }, { status: 400 });
      }
      if (file.size > WORKPACK_MAX_BYTES) {
        return NextResponse.json({ error: "That file is too large." }, { status: 413 });
      }
      raw = JSON.parse(await file.text());
    } else {
      raw = await request.json();
    }
  } catch {
    return NextResponse.json({ error: "That file is not valid JSON." }, { status: 400 });
  }

  const parsed = parseTeamWorkpack(raw);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const counts = await importTeamWorkpack(parsed, { id: user.id, email: user.email });
  await writeAudit({
    actorId: user.id,
    action: "WORKPACK_IMPORTED",
    entityType: "Workpack",
    details: counts as unknown as Record<string, unknown>,
  });
  revalidatePath("/", "layout");
  return NextResponse.json({ ok: true, counts });
}
