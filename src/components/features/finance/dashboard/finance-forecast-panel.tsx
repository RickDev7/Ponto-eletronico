"use client";

import { useTranslations } from "next-intl";
import { TrendingUp } from "lucide-react";
import type { FinanceForecast } from "@/lib/finance/dashboard-data";
import { formatMoney } from "@/lib/finance/utils";

interface FinanceForecastPanelProps {
  forecast: FinanceForecast;
  locale: string;
}

export function FinanceForecastPanel({ forecast, locale }: FinanceForecastPanelProps) {
  const t = useTranslations("finance.dashboard");

  const rows = [
    { label: t("forecast.days30"), value: forecast.days30Cents, highlight: false },
    { label: t("forecast.days60"), value: forecast.days60Cents, highlight: false },
    { label: t("forecast.days90"), value: forecast.days90Cents, highlight: false },
    { label: t("forecast.annual"), value: forecast.annualCents, highlight: true },
    {
      label: t("forecast.contractRecurring"),
      value: forecast.contractRecurring30Cents,
      highlight: false,
    },
    { label: t("forecast.receivables"), value: forecast.receivables30Cents, highlight: false },
    { label: t("forecast.pipelinePotential"), value: forecast.pipelinePotentialCents, highlight: false },
  ];

  return (
    <div className="rounded-xl border border-blue-500/20 bg-gradient-to-br from-blue-500/[0.06] to-card p-4">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex size-8 items-center justify-center rounded-lg bg-blue-500/10">
          <TrendingUp className="size-4 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h3 className="text-sm font-semibold">{t("forecast.title")}</h3>
          <p className="text-xs text-muted-foreground">{t("forecast.subtitle")}</p>
        </div>
      </div>
      <div className="space-y-3">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between border-b border-border/40 pb-2 last:border-0 last:pb-0"
          >
            <span className="text-xs text-muted-foreground">{row.label}</span>
            <span
              className={
                row.highlight
                  ? "text-base font-semibold tabular-nums text-blue-600 dark:text-blue-400"
                  : "text-sm font-medium tabular-nums"
              }
            >
              {formatMoney(row.value, "EUR", locale)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
