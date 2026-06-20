"use client";

import { cn } from "@/lib/utils";
import { FinanceSparkline } from "./finance-sparkline";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface FinanceKpiCardProps {
  label: string;
  value: string;
  sublabel?: string;
  trend?: { value: string; positive: boolean };
  sparkline?: number[];
  alert?: boolean;
  tooltip?: string;
  accent?: "emerald" | "blue" | "amber" | "rose" | "neutral";
}

const accentMap = {
  emerald: "text-emerald-600 dark:text-emerald-400",
  blue: "text-blue-600 dark:text-blue-400",
  amber: "text-amber-600 dark:text-amber-400",
  rose: "text-rose-600 dark:text-rose-400",
  neutral: "text-foreground",
};

const sparkColors = {
  emerald: "rgb(16, 185, 129)",
  blue: "rgb(59, 130, 246)",
  amber: "rgb(245, 158, 11)",
  rose: "rgb(244, 63, 94)",
  neutral: "rgb(113, 113, 122)",
};

export function FinanceKpiCard({
  label,
  value,
  sublabel,
  trend,
  sparkline,
  alert,
  tooltip,
  accent = "neutral",
}: FinanceKpiCardProps) {
  const card = (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border bg-card p-4 transition-colors hover:bg-muted/20",
        alert
          ? "border-rose-500/30 bg-rose-500/[0.03] dark:bg-rose-500/[0.06]"
          : "border-border/60",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <p className={cn("mt-1.5 text-2xl font-semibold tabular-nums tracking-tight", accentMap[accent])}>
            {value}
          </p>
          {sublabel && (
            <p className="mt-1 text-xs text-muted-foreground">{sublabel}</p>
          )}
          {trend && (
            <p
              className={cn(
                "mt-1.5 text-xs font-medium tabular-nums",
                trend.positive
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-rose-600 dark:text-rose-400",
              )}
            >
              {trend.value}
            </p>
          )}
        </div>
        {sparkline && sparkline.length > 1 && (
          <FinanceSparkline
            data={sparkline}
            className="h-7 w-20 shrink-0 opacity-70 transition-opacity group-hover:opacity-100"
            color={sparkColors[accent]}
          />
        )}
      </div>
    </div>
  );

  if (!tooltip) return card;

  return (
    <Tooltip>
      <TooltipTrigger render={card} />
      <TooltipContent side="top">{tooltip}</TooltipContent>
    </Tooltip>
  );
}
