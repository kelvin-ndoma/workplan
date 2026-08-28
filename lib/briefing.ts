/** Order Will walks during the Teams call. */
export const BRIEFING_ORDER = ["Mike", "John", "Will", "London", "Drew", "Kuyu", "Kelvin"] as const;

export function firstName(name?: string | null) {
  return (name ?? "").trim().split(/\s+/)[0] || "";
}

export function briefingRank(name?: string | null) {
  const first = firstName(name).toLowerCase();
  const index = BRIEFING_ORDER.findIndex(
    (item) => first === item.toLowerCase() || first.startsWith(item.toLowerCase()),
  );
  return index === -1 ? 99 : index;
}

export function sortByBriefingOrder<T>(items: T[], getName: (item: T) => string | undefined | null) {
  return [...items].sort((a, b) => briefingRank(getName(a)) - briefingRank(getName(b)));
}

export function linesToText(items?: string[] | null, fallback?: string | null) {
  const lines = (items ?? []).map((item) => item.trim()).filter(Boolean);
  if (lines.length) return lines.join("\n");
  return fallback?.trim() || "";
}
