import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/session";
import { writeAudit } from "@/lib/services/events";
import { nextMeetingDateKey } from "@/lib/meetings/cadence";
import {
  WORKPACK_MAX_BYTES,
  buildTeamWorkpack,
  buildTransferRows,
  importTeamWorkpack,
  parseUploadedWork,
  peopleWorkToCsv,
  transferRowsToJson,
} from "@/lib/workpack";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(request.url);
  const format = url.searchParams.get("format") ?? "csv";
  const view = url.searchParams.get("view") === "1";
  const day = new Date().toISOString().slice(0, 10);

  if (format === "full") {
    const pack = await buildTeamWorkpack();
    await writeAudit({
      actorId: user.id,
      action: view ? "WORKPACK_VIEWED" : "WORKPACK_EXPORTED",
      entityType: "Workpack",
      details: {
        people: pack.people.length,
        projects: pack.projects.length,
        tasks: pack.tasks.length,
      },
    });
    return new NextResponse(JSON.stringify(pack, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": view
          ? "inline"
          : `attachment; filename="workplan-team-${day}.json"`,
        "Cache-Control": "no-store",
      },
    });
  }

  const rows = await buildTransferRows();
  const stamp = rows[0]?.meeting || nextMeetingDateKey();
  await writeAudit({
    actorId: user.id,
    action: view ? "PEOPLE_WORK_VIEWED" : "PEOPLE_WORK_EXPORTED",
    entityType: "Workpack",
    details: { rows: rows.length, format, meeting: stamp, month: rows[0]?.month ?? "" },
  });

  if (format === "json") {
    return new NextResponse(transferRowsToJson(rows), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": view
          ? "inline"
          : `attachment; filename="workplan-upcoming-${stamp}.json"`,
        "Cache-Control": "no-store",
      },
    });
  }

  return new NextResponse(peopleWorkToCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": view
        ? "inline"
        : `attachment; filename="workplan-upcoming-${stamp}.csv"`,
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

  let text = "";
  const contentType = request.headers.get("content-type") ?? "";
  try {
    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const file = form.get("file");
      if (!(file instanceof File)) {
        return NextResponse.json({ error: "Choose a CSV or JSON file." }, { status: 400 });
      }
      if (file.size > WORKPACK_MAX_BYTES) {
        return NextResponse.json({ error: "That file is too large." }, { status: 413 });
      }
      text = await file.text();
    } else {
      text = await request.text();
    }
  } catch {
    return NextResponse.json({ error: "Could not read that file." }, { status: 400 });
  }

  const parsed = parseUploadedWork(text);
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
