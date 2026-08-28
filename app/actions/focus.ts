"use server";

import { revalidatePath } from "next/cache";
import { connectDB } from "@/lib/db";
import { requireRole, requireUser } from "@/lib/session";
import { currentWorkPlanMonth } from "@/lib/dates";
import { isEmailConfigured } from "@/lib/email";
import { writeAudit } from "@/lib/services/events";
import { sendCallReminders, sendUpdateStatusReminders } from "@/lib/services/reminders";
import { MonthFocus } from "@/models";

export async function saveMonthFocusAction(input: { month?: string; summary: string }) {
  const user = await requireRole(["ADMIN"]);
  const month = input.month || currentWorkPlanMonth();
  await connectDB();
  await MonthFocus.findOneAndUpdate(
    { month },
    { summary: input.summary.trim(), setBy: user.id },
    { upsert: true, new: true },
  );
  await writeAudit({
    actorId: user.id,
    action: "FOCUS_UPDATED",
    entityType: "MonthFocus",
    entityId: month,
    details: { month },
  });
  revalidatePath("/leadership");
  revalidatePath("/my-work");
  revalidatePath("/team");
  return { ok: true };
}

export async function sendCallRemindersAction(input?: { force?: boolean }) {
  const user = await requireUser();
  if (user.role !== "ADMIN" && user.role !== "MANAGER") {
    return { error: "Not permitted." };
  }
  const result = await sendCallReminders({ force: Boolean(input?.force), actorId: user.id });
  revalidatePath("/leadership");
  revalidatePath("/notifications");
  revalidatePath("/communication");
  return result;
}

export async function sendUpdateStatusRemindersAction(input?: { note?: string }) {
  const user = await requireUser();
  if (user.role !== "ADMIN" && user.role !== "MANAGER") {
    return { error: "Not permitted." };
  }
  const result = await sendUpdateStatusReminders({
    actorId: user.id,
    actorName: user.name,
    note: input?.note,
  });
  revalidatePath("/leadership");
  revalidatePath("/notifications");
  revalidatePath("/communication");
  return result;
}

export async function emailStatusAction() {
  return { configured: isEmailConfigured() };
}
