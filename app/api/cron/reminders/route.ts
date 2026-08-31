import { createHash, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { sendCallReminders } from "@/lib/services/reminders";
import { reminderWindow } from "@/lib/meetings/cadence";

export const dynamic = "force-dynamic";

function authorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 16) return false;
  const header = request.headers.get("authorization") ?? "";
  const sent = header.startsWith("Bearer ") ? header.slice(7) : "";
  const left = createHash("sha256").update(sent).digest();
  const right = createHash("sha256").update(secret).digest();
  return timingSafeEqual(left, right);
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const window = reminderWindow();
  if (!window && request.nextUrl.searchParams.get("force") !== "1") {
    return NextResponse.json({ skipped: true, reason: "not-a-reminder-day" });
  }
  const result = await sendCallReminders({ force: request.nextUrl.searchParams.get("force") === "1" });
  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  return GET(request);
}
