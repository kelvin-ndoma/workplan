/** Same-origin path only. Blocks protocol-relative and external URLs. */
export function safeInternalPath(value?: string | null) {
  if (!value) return "/";
  const path = value.trim();
  if (!path.startsWith("/")) return "/";
  if (path.startsWith("//") || path.startsWith("/\\")) return "/";
  if (path.includes("://") || path.includes("\\")) return "/";
  return path;
}
