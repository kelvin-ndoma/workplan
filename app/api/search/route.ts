import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { searchAll } from "@/lib/queries";

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ users: [], projects: [], deliverables: [], tasks: [], meetings: [] });
  const results = await searchAll(q);
  return NextResponse.json(results);
}
