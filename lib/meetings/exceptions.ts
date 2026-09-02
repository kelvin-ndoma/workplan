/** One-off call date moves: original date → new date (YYYY-MM-DD, Africa/Nairobi). */
export const MEETING_DATE_MOVES: Record<string, string> = {
  "2026-09-01": "2026-09-02",
};

export function canonicalMeetingDate(key: string) {
  return MEETING_DATE_MOVES[key] ?? key;
}

export function extraMeetingDates() {
  return new Set(Object.values(MEETING_DATE_MOVES));
}

export function cancelledMeetingDates() {
  return new Set(Object.keys(MEETING_DATE_MOVES));
}
