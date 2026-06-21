"use client";

import { useTranslations } from "next-intl";
import {
  Activity,
  BadgePercent,
  Euro,
  ShieldCheck,
  Users,
} from "lucide-react";
import type { AnalyticsCenterData } from "@/lib/analytics/analytics-center-types";
import { formatMoney } from "@/lib/finance/utils";
import { cn } from "@/lib/utils";

interface AnalyticsPillarStripProps {
  data: AnalyticsCenterData;
  locale: string;
  highlight?: Array<"utilization" | "revenue" | "profitability" | "sla" | "workforce">;
}

const PILLARS = [
  { key: "utilization" as const, icon: Activity, accent: "text-blue-600 dark:text-blue-400" },
  { key: "revenue" as const, icon: Euro, accent: "text-emerald-600 dark:text-emerald-400" },
  { key: "profitability" as const, icon: BadgePercent, accent: "text-violet-600 dark:text-violet-400" },
  { key: "sla" as const, icon: ShieldCheck, accent: "text-amber-600 dark:text-amber-400" },
  { key: "workforce" as const, icon: Users, accent: "text-rose-600 dark:text-rose-400" },
];

export function AnalyticsPillarStrip({ data, locale, highlight }: AnalyticsPillarStripProps) {
  const t = useTranslations("analytics.pillars");

  function value(key: (typeof PILLARS)[number]["key"]): string {
    switch (key) {
      case "utilization":
        return `${data.utilization.pct}%`;
      case "revenue":
        return formatMoney(data.revenue.receivedYtdCents, "EUR", locale);
      case "profitability":
        return `${data.profitability.grossMarginPct}%`;
      case "sla":
        return `${data.sla.compliancePct}%`;
      case "workforce":
        return `${data.workforce.productivityPct}%`;
    }
  }

  function hint(key: (typeof PILLARS)[number]["key"]): string {
    switch (key) {
      case "utilization":
        return t("utilizationHint", {
          hours: Math.round(data.utilization.workedMinutes / 60),
        });
      case "revenue":
        return t("revenueHint", {
          mrr: formatMoney(data.revenue.mrrCents, "EUR", locale),
        });
      case "profitability":
        return formatMoney(data.profitability.grossProfitCents, "EUR", locale);
      case "sla":
        return t("slaHint", { overdue: data.sla.overdueOpenCount });
      case "workforce":
        return t("workforceHint", {
          completed: data.workforce.completedTasks,
          employees: data.workforce.activeEmployees,
        });
    }
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {PILLARS.map(({ key, icon: Icon, accent }) => {
        const dimmed = highlight && highlight.length > 0 && !highlight.includes(key);
        return (
          <div
            key={key}
            className={cn(
              "relative overflow-hidden rounded-xl border border-border/60 bg-card p-4 transition-opacity",
              dimmed && "opacity-60",
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {t(key)}
              </p>
              <Icon className={cn("size-5 opacity-30", accent)} />
            </div>
            <p className={cn("mt-2 text-2xl font-semibold tabular-nums", accent)}>{value(key)}</p>
            <p className="mt-1 text-[10px] text-muted-foreground">{hint(key)}</p>
          </div>
        );
      })}
    </div>
  );
}
