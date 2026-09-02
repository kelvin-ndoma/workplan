import { connectDB } from "../lib/db";
import { MEETING_DATE_MOVES } from "../lib/meetings/exceptions";
import { Meeting, MeetingStatus } from "../models";

async function moveStatuses(from: string, to: string) {
  const rows = await MeetingStatus.find({ meetingDate: from });
  let moved = 0;
  let skipped = 0;
  for (const row of rows) {
    const exists = await MeetingStatus.findOne({ taskId: row.taskId, meetingDate: to });
    if (exists) {
      skipped += 1;
      continue;
    }
    row.meetingDate = to;
    await row.save();
    moved += 1;
  }
  return { moved, skipped, total: rows.length };
}

async function moveMeetings(from: string, to: string) {
  const start = new Date(`${from}T00:00:00.000Z`);
  const end = new Date(`${from}T23:59:59.999Z`);
  const toDate = new Date(`${to}T12:00:00.000Z`);
  const result = await Meeting.updateMany({ date: { $gte: start, $lte: end } }, { $set: { date: toDate } });
  return result.modifiedCount ?? 0;
}

async function main() {
  await connectDB();
  for (const [from, to] of Object.entries(MEETING_DATE_MOVES)) {
    const statuses = await moveStatuses(from, to);
    const meetings = await moveMeetings(from, to);
    console.log(`${from} → ${to}: status ${statuses.moved} moved, ${statuses.skipped} already on new date, meetings ${meetings}`);
  }
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
