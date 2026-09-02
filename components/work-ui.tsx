import { cn } from "@/lib/utils";

export function ProgressBar({
  value,
  className,
  indicatorClassName,
}: {
  value: number;
  className?: string;
  indicatorClassName?: string;
}) {
  const clamped = Math.min(100, Math.max(0, Number.isFinite(value) ? value : 0));
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-muted", className)}>
      <div
        className={cn("h-full rounded-full bg-primary transition-all", indicatorClassName)}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

const statusStyles: Record<string, string> = {
  NOT_STARTED: "bg-slate-100 text-slate-700",
  IN_PROGRESS: "bg-blue-50 text-blue-700",
  AT_RISK: "bg-amber-50 text-amber-800",
  BLOCKED: "bg-red-50 text-red-700",
  COMPLETED: "bg-emerald-50 text-emerald-700",
  CANCELLED: "bg-slate-100 text-slate-500 line-through",
  PLANNING: "bg-slate-100 text-slate-700",
  ACTIVE: "bg-blue-50 text-blue-700",
  ON_HOLD: "bg-amber-50 text-amber-800",
  ARCHIVED: "bg-slate-100 text-slate-500",
  SCHEDULED: "bg-slate-100 text-slate-700",
  LIVE: "bg-red-50 text-red-700",
  OPEN: "bg-amber-50 text-amber-800",
  RESOLVED: "bg-emerald-50 text-emerald-700",
  LOW: "bg-slate-100 text-slate-600",
  MEDIUM: "bg-sky-50 text-sky-700",
  HIGH: "bg-orange-50 text-orange-700",
  CRITICAL: "bg-red-50 text-red-700",
  ADMIN: "bg-indigo-50 text-indigo-700",
  MANAGER: "bg-violet-50 text-violet-700",
  TEAM_MEMBER: "bg-slate-100 text-slate-700",
};

export function StatusBadge({
  value,
  className,
}: {
  value?: string | null;
  className?: string;
}) {
  if (!value) return null;
  const label = value.replaceAll("_", " ");
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold tracking-wide uppercase",
        statusStyles[value] ?? "bg-muted text-muted-foreground",
        className,
      )}
    >
      {label}
    </span>
  );
}

export function initials(name?: string) {
  if (!name) return "?";
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function UserAvatar({
  name,
  src,
  size = "md",
}: {
  name?: string;
  src?: string;
  size?: "sm" | "md" | "lg";
}) {
  const dim = size === "sm" ? "size-7 text-[10px]" : size === "lg" ? "size-12 text-base" : "size-9 text-xs";
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-[oklch(0.32_0.06_255)] font-semibold text-white",
        dim,
      )}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name} className="size-full rounded-full object-cover" />
      ) : (
        initials(name)
      )}
    </span>
  );
}

export function StatCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "default" | "success" | "warning" | "danger" | "info";
}) {
  const tones = {
    default: "text-foreground",
    success: "text-emerald-700",
    warning: "text-amber-700",
    danger: "text-red-700",
    info: "text-blue-700",
  };
  return (
    <div className="rounded-xl border border-border/70 bg-card px-4 py-3.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("mt-1 text-2xl font-semibold tracking-tight tabular-nums", tones[tone])}>{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <div className="max-w-3xl min-w-0">
        {eyebrow ? <p className="mb-1 text-xs font-medium text-muted-foreground">{eyebrow}</p> : null}
        <h1 className="text-xl leading-tight font-semibold tracking-tight text-foreground sm:text-[1.65rem]">{title}</h1>
        {description ? <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card/50 px-5 py-8 text-center">
      <p className="text-sm font-medium">{title}</p>
      {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
    </div>
  );
}
