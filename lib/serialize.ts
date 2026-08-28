function mapIds(value: unknown): unknown {
  if (value == null) return value;
  if (Array.isArray(value)) return value.map(mapIds);
  if (typeof value !== "object") return value;

  const record = value as Record<string, unknown>;
  const next: Record<string, unknown> = {};

  for (const [key, nested] of Object.entries(record)) {
    if (key === "_id") {
      next.id = String(nested);
      continue;
    }
    next[key] = mapIds(nested);
  }

  return next;
}

/* Serialized mongoose documents are passed to the UI as plain objects. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function serialize<T = any>(doc: unknown): T {
  if (doc == null) return doc as T;
  const plain = JSON.parse(JSON.stringify(doc));
  return mapIds(plain) as T;
}
