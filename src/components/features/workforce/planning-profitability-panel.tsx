"use client";

import { useTranslations } from "next-intl";
import type { PlanningProfitRow } from "@/lib/workforce/planning-profitability-types";
import { formatEuro } from "@/lib/workforce/planning-profitability-types";
import { cn } from "@/lib/utils";

interface PlanningProfitabilityPanelProps {
  byEmployee: PlanningProfitRow[];
  byClient: PlanningProfitRow[];
  totalMarginCents: number;
  className?: string;
}

function ProfitTable({
  title,
  rows,
}: {
  title: string;
  rows: PlanningProfitRow[];
}) {
  const t = useTranslations("workforce.planning.profitability");

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-border/60 bg-card p-4">
        <h3 className="mb-2 text-sm font-semibold">{title}</h3>
        <p className="text-xs text-muted-foreground">{t("empty")}</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border/60 bg-card p-4">
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      <div className="space-y-2">
        {rows.map((row) => (
          <div
            key={row.id}
            className="flex items-center justify-between gap-2 rounded-lg border border-border/40 px-3 py-2 text-xs"
          >
            <div className="min-w-0">
              <p className="truncate font-medium">{row.name}</p>
              <p className="text-muted-foreground">
                {row.shiftCount} {t("shifts")} · {formatEuro(row.laborCostCents)} {t("labor")}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="font-semibold tabular-nums">{formatEuro(row.marginCents)}</p>
              <p
                className={cn(
                  "tabular-nums",
                  row.marginPct >= 20 ? "text-emerald-600" : row.marginPct >= 0 ? "text-amber-600" : "text-rose-600",
                )}
              >
                {row.marginPct}%
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PlanningProfitabilityPanel({
  byEmployee,
  byClient,
  totalMarginCents,
  className,
}: PlanningProfitabilityPanelProps) {
  const t = useTranslations("workforce.planning.profitability");

  return (
    <div className={cn("space-y-4", className)}>
      <div className="rounded-xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/[0.06] to-card px-4 py-3">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{t("totalMargin")}</p>
        <p className="text-xl font-semibold tabular-nums">{formatEuro(totalMarginCents)}</p>
      </div>
      <ProfitTable title={t("byEmployee")} rows={byEmployee} />
      <ProfitTable title={t("byClient")} rows={byClient} />
    </div>
  );
}
