import { format, parseISO } from "date-fns";
import { extraMeetingDates, cancelledMeetingDates, canonicalMeetingDate } from "@/lib/meetings/exceptions";

export { canonicalMeetingDate } from "@/lib/meetings/exceptions";

export const MEETING_TZ = "Africa/Nairobi";
export const MEETING_START = "15:30";
export const MEETING_END = "16:30";
export const MEETING_TIME_LABEL = "3:30 PM EAT · 8:30 AM ET";
export const MEETING_HOUR = 15;
export const MEETING_MINUTE = 30;
export const PRESENT_WINDOW_HOURS = 4;
export const HOUR_BEFORE_REMINDER_LABEL = "2:30 PM EAT · 7:30 AM ET";

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;
const EAT_OFFSET_MS = 3 * 60 * 60 * 1000;

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function eatParts(now: Date = new Date()) {
  const eat = new Date(now.getTime() + EAT_OFFSET_MS);
  return {
    year: eat.getUTCFullYear(),
    month: eat.getUTCMonth() + 1,
    day: eat.getUTCDate(),
    hour: eat.getUTCHours(),
    minute: eat.getUTCMinutes(),
  };
}

function utcDate(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
}

export function toDateKey(value?: string | Date | null) {
  if (!value) return nairobiDateKey();
  if (typeof value === "string") {
    const key = value.slice(0, 10);
    if (DATE_KEY.test(key)) return key;
    return nairobiDateKey(parseISO(value));
  }
  return nairobiDateKey(value);
}

export function dateFromKey(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  return utcDate(year, month, day);
}

export function addCalendarDays(key: string, days: number) {
  const [year, month, day] = key.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + days, 12, 0, 0));
  return `${next.getUTCFullYear()}-${pad(next.getUTCMonth() + 1)}-${pad(next.getUTCDate())}`;
}

export function weekdayFromKey(key: string) {
  return dateFromKey(key).getUTCDay();
}

export function isMeetingDateKey(key: string) {
  if (!DATE_KEY.test(key)) return false;
  if (cancelledMeetingDates().has(key)) return false;
  if (extraMeetingDates().has(key)) return true;
  const day = weekdayFromKey(key);
  return day === 2 || day === 5;
}

export function nairobiDateKey(now: Date = new Date()) {
  const { year, month, day } = eatParts(now);
  return `${year}-${pad(month)}-${pad(day)}`;
}

export function nairobiClock(now: Date = new Date()) {
  const { hour, minute } = eatParts(now);
  return { hour, minute };
}

function minutesSinceMidnight(now: Date = new Date()) {
  const { hour, minute } = nairobiClock(now);
  return hour * 60 + minute;
}

function meetingEndMinutes() {
  return MEETING_HOUR * 60 + MEETING_MINUTE + PRESENT_WINDOW_HOURS * 60;
}

export function meetingPassedOnDate(key: string, now: Date = new Date()) {
  if (nairobiDateKey(now) !== key) return nairobiDateKey(now) > key;
  return minutesSinceMidnight(now) >= meetingEndMinutes();
}

export function isMeetingPresent(key: string, now: Date = new Date()) {
  if (!isMeetingDateKey(key)) return false;
  if (nairobiDateKey(now) !== key) return false;
  return !meetingPassedOnDate(key, now);
}

export function presentMeetingDateKey(now: Date = new Date()) {
  const today = nairobiDateKey(now);
  return isMeetingPresent(today, now) ? today : null;
}

export function minutesUntilMeeting(now: Date = new Date()) {
  const next = nextMeetingDateKey(now);
  if (next !== nairobiDateKey(now)) return null;
  const { hour, minute } = nairobiClock(now);
  return MEETING_HOUR * 60 + MEETING_MINUTE - (hour * 60 + minute);
}

export type ReminderKind = "CALL_DAY_BEFORE" | "CALL_DAY_OF" | "CALL_HOUR_BEFORE";

export function reminderWindow(now: Date = new Date()) {
  const next = nextMeetingDateKey(now);
  const today = nairobiDateKey(now);
  const until = minutesUntilMeeting(now);
  if (until != null && until >= 45 && until <= 75) {
    return { kind: "CALL_HOUR_BEFORE" as const, date: dateFromKey(next), dateKey: next };
  }
  if (next === today) {
    return { kind: "CALL_DAY_OF" as const, date: dateFromKey(next), dateKey: next };
  }
  if (next === addCalendarDays(today, 1)) {
    return { kind: "CALL_DAY_BEFORE" as const, date: dateFromKey(next), dateKey: next };
  }
  return null;
}

export function toDate(value?: string | Date | null) {
  if (!value) return dateFromKey(nairobiDateKey());
  if (value instanceof Date) return value;
  if (DATE_KEY.test(value.slice(0, 10)) && value.length <= 10) return dateFromKey(value);
  return parseISO(value);
}

export function isTeamMeetingDay(date: Date | string = new Date()) {
  return isMeetingDateKey(toDateKey(date));
}

export function meetingDayName(date: Date | string) {
  const day = weekdayFromKey(toDateKey(date));
  if (day === 2) return "Tuesday";
  if (day === 5) return "Friday";
  return format(dateFromKey(toDateKey(date)), "EEEE");
}

export function meetingDayShort(date: Date | string) {
  return format(dateFromKey(toDateKey(date)), "EEE");
}

function scanMeeting(fromKey: string, step: 1 | -1, skipTodayIfPassed: boolean, now = new Date()) {
  let key = fromKey;
  for (let i = 0; i < 14; i += 1) {
    if (isMeetingDateKey(key)) {
      const skip = skipTodayIfPassed && step === 1 && meetingPassedOnDate(key, now);
      if (!skip) return key;
    }
    key = addCalendarDays(key, step);
  }
  return fromKey;
}

export function nextMeetingDateKey(from: Date = new Date()) {
  return scanMeeting(nairobiDateKey(from), 1, true, from);
}

export function lastCompletedMeetingDateKey(from: Date = new Date()) {
  return previousMeetingDateKey(nextMeetingDateKey(from));
}

export function recentMeetingDateKeys(count = 8, from: Date = new Date()) {
  const working = nextMeetingDateKey(from);
  const keys = [working];
  const future = Math.min(2, Math.max(0, count - 1));
  while (keys.length < 1 + future) {
    keys.push(followingMeetingDateKey(keys[keys.length - 1]));
  }
  while (keys.length < count) {
    keys.unshift(previousMeetingDateKey(keys[0]));
  }
  return keys;
}

export function previousMeetingDateKey(fromKeyOrDate: string | Date = new Date()) {
  const start = typeof fromKeyOrDate === "string" ? fromKeyOrDate : nairobiDateKey(fromKeyOrDate);
  return scanMeeting(addCalendarDays(start, -1), -1, false);
}

export function followingMeetingDateKey(fromKey: string) {
  return scanMeeting(addCalendarDays(fromKey, 1), 1, false);
}

export function nextTuesdayMeeting(from: Date = new Date()) {
  let key = nairobiDateKey(from);
  for (let i = 0; i < 14; i += 1) {
    if (weekdayFromKey(key) === 2 && !meetingPassedOnDate(key, from)) return dateFromKey(key);
    key = addCalendarDays(key, 1);
  }
  return dateFromKey(key);
}

export function nextFridayMeeting(from: Date = new Date()) {
  let key = nairobiDateKey(from);
  for (let i = 0; i < 14; i += 1) {
    if (weekdayFromKey(key) === 5 && !meetingPassedOnDate(key, from)) return dateFromKey(key);
    key = addCalendarDays(key, 1);
  }
  return dateFromKey(key);
}

export function nextMeetingDate(from: Date = new Date()) {
  return dateFromKey(nextMeetingDateKey(from));
}

export function resolveMeetingDateKey(value?: string | null) {
  if (value) {
    const key = canonicalMeetingDate(value.slice(0, 10));
    if (isMeetingDateKey(key)) return key;
  }
  return nextMeetingDateKey();
}

export function isEditableMeetingDate(key?: string | null, now: Date = new Date()) {
  const working = nextMeetingDateKey(now);
  if (!key) return true;
  if (!isMeetingDateKey(key)) return false;
  return key >= working;
}

export function meetingDatesInRange(start: Date, end: Date) {
  const keys: string[] = [];
  let key = nairobiDateKey(start);
  const last = nairobiDateKey(end);
  while (key <= last) {
    if (isMeetingDateKey(key)) keys.push(key);
    key = addCalendarDays(key, 1);
  }
  return keys;
}

export function formatMeetingDateLabel(key: string) {
  return `${meetingDayName(key)}, ${format(dateFromKey(key), "MMM d")}`;
}

export function formatMeetingDateLong(key: string) {
  return `${meetingDayName(key)}, ${format(dateFromKey(key), "MMMM d")}`;
}

export function defaultMeetingTitle(date: Date | string) {
  return `${meetingDayName(date)} team call · ${format(dateFromKey(toDateKey(date)), "MMM d")}`;
}

export function defaultMeetingAgenda() {
  return [
    "Owner brief-outs — 5 minutes each",
    "Decisions",
    "Action items before the next meeting",
  ];
}

export function formatClock(time?: string | null) {
  if (!time) return "";
  const [hours, minutes] = time.split(":").map(Number);
  if (!Number.isFinite(hours)) return time;
  const date = new Date();
  date.setHours(hours, minutes || 0, 0, 0);
  return format(date, "h:mm a");
}

export function formatMeetingWhen(
  date?: string | Date | null,
  startTime?: string | null,
  endTime?: string | null,
) {
  const day = formatMeetingDateLabel(toDateKey(date));
  const start = startTime || MEETING_START;
  const end = endTime || MEETING_END;
  return `${day} · ${formatClock(start)}–${formatClock(end)} EAT`;
}

export function dateInputValue(date: Date | string = nextMeetingDate()) {
  return toDateKey(date);
}

export function monthFromMeeting(key: string) {
  return key.slice(0, 7);
}
