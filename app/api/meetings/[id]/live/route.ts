import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { connectDB } from "@/lib/db";
import { Meeting } from "@/models/Meeting";
import { serialize } from "@/lib/serialize";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  await connectDB();
  const meeting = await Meeting.findById(id)
    .select("status liveState title date workPlanMonth")
    .lean();
  if (!meeting) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(serialize(meeting));
}
