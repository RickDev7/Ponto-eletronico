import Link from "next/link";
import { cn } from "@/lib/utils";
import type { TrendIndicator, WithClassName, WithIcon } from "./types";

export interface KpiCardProps extends WithClassName, WithIcon {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  trend?: TrendIndicator;
  href?: string;
  iconBgClassName?: string;
  loading?: boolean;
  /** Stripe-style flat cell inside a metrics strip. */
  variant?: "card" | "strip";
}

export function KpiCard({
  label,
  value,
  hint,
  trend,
  href,
  icon: Icon,
  iconClassName,
  loading = false,
  variant = "card",
  className,
}: KpiCardProps) {
  const content = (
    <div
      data-loading={loading || undefined}
      className={cn(
        "group relative min-w-0",
        variant === "card" &&
          "rounded-lg border border-border bg-card p-2.5 transition-colors hover:bg-muted/20",
        variant === "strip" && "bg-transparent px-3 py-2 transition-colors hover:bg-muted/20",
        href && "cursor-pointer",
        loading && "animate-pulse",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-lg font-semibold tabular-nums leading-none tracking-tight text-foreground">
            {loading ? "—" : value}
          </p>
          <p className="mt-1.5 truncate text-[11px] leading-tight text-muted-foreground">
            {label}
          </p>
          {hint && !loading && (
            <p className="mt-0.5 truncate text-[10px] text-muted-foreground/80">
              {hint}
            </p>
          )}
        </div>
        {Icon && (
          <Icon
            className={cn(
              "size-3.5 shrink-0 opacity-40 transition-opacity group-hover:opacity-70",
              iconClassName,
            )}
            aria-hidden
          />
        )}
      </div>
    </div>
  );

  if (href && !loading) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}
