type Weighted = { progress: number; weight?: number; status?: string };

export function weightedProgress(items: Weighted[]) {
  const active = items.filter((item) => item.status !== "CANCELLED");
  const totalWeight = active.reduce((sum, item) => sum + (item.weight ?? 1), 0);
  if (totalWeight === 0) return 0;
  const score = active.reduce(
    (sum, item) => sum + Math.min(100, Math.max(0, item.progress ?? 0)) * (item.weight ?? 1),
    0,
  );
  return Math.round(score / totalWeight);
}

export function progressTone(value: number) {
  if (value >= 80) return "success";
  if (value >= 50) return "info";
  if (value >= 25) return "warning";
  return "danger";
}
