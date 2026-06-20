import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  iconClassName?: string;
  iconBgClassName?: string;
  href?: string;
  className?: string;
}

export function KpiCard({
  title,
  value,
  icon: Icon,
  iconClassName,
  iconBgClassName = "bg-primary/10",
  href,
  className,
}: KpiCardProps) {
  const content = (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border border-border/60 bg-card p-4",
        "shadow-sm transition-all duration-200",
        href && "cursor-pointer hover:border-primary/30 hover:shadow-md hover:-translate-y-0.5",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/[0.03] to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {title}
          </p>
          <p className="mt-1.5 text-3xl font-bold tabular-nums tracking-tight">
            {value}
          </p>
        </div>
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-xl",
            iconBgClassName,
          )}
        >
          <Icon className={cn("size-4", iconClassName)} />
        </div>
      </div>
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}
