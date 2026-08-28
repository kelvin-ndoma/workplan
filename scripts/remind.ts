import mongoose from "mongoose";
import { sendCallReminders } from "../lib/services/reminders";
import { meetingDayName, nextMeetingDate, reminderWindow } from "../lib/meetings/cadence";

async function main() {
  const window = reminderWindow();
  const next = nextMeetingDate();
  console.log(
    window
      ? `Reminder window: ${window.kind} for ${meetingDayName(window.date)}`
      : `No auto window (next call ${meetingDayName(next)}). Use --force to send anyway.`,
  );
  const result = await sendCallReminders({ force: process.argv.includes("--force") });
  console.log(result);
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});
