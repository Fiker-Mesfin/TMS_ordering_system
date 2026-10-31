import { cn } from "@/lib/utils";

const STYLES: Record<string, string> = {
  pending: "bg-warning text-warning-foreground",
  confirmed: "bg-success text-success-foreground",
  cancelled: "bg-muted text-muted-foreground",
  unverified: "bg-muted text-muted-foreground",
  verified: "bg-success text-success-foreground",
  rejected: "bg-destructive text-destructive-foreground",
};

export function StatusBadge({
  status,
  label,
  className,
}: {
  status: string;
  label?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide",
        STYLES[status],
        className,
      )}
    >
      {label ?? status}
    </span>
  );
}
