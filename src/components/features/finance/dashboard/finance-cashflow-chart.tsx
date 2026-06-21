"use client";

import { useTranslations } from "next-intl";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { FinanceCashflowPoint } from "@/lib/finance/dashboard-data";
import { chartTooltipStyle, useChartTheme } from "@/lib/charts/chart-theme";
import { formatMoney } from "@/lib/finance/utils";

interface FinanceCashflowChartProps {
  points: FinanceCashflowPoint[];
  locale: string;
}

export function FinanceCashflowChart({ points, locale }: FinanceCashflowChartProps) {
  const t = useTranslations("finance.dashboard");
  const chart = useChartTheme();
  const tooltip = chartTooltipStyle(chart);

  const data = points.slice(-6).map((p) => ({
    name: p.label,
    inflow: p.inflow / 100,
    outflow: p.outflow / 100,
    balance: p.balance / 100,
  }));

  return (
    <div className="rounded-xl border border-border/60 bg-card p-4 sm:p-5">
      <div className="mb-4">
        <h3 className="text-sm font-semibold tracking-tight">{t("cashflow.title")}</h3>
        <p className="text-xs text-muted-foreground">{t("cashflow.subtitle")}</p>
      </div>
      <div className="h-52 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={chart.grid} strokeDasharray="3 3" vertical={false} opacity={0.5} />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: chart.axis }} axisLine={false} tickLine={false} />
            <YAxis
              tick={{ fontSize: 10, fill: chart.axis }}
              axisLine={false}
              tickLine={false}
              width={40}
              tickFormatter={(v) => `€${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
            />
            <Tooltip
              {...tooltip}
              formatter={(value: number, name: string) => [
                formatMoney(Math.round(value * 100), "EUR", locale),
                name === "inflow"
                  ? t("cashflow.inflow")
                  : name === "outflow"
                    ? t("cashflow.outflow")
                    : t("cashflow.balance"),
              ]}
            />
            <Bar dataKey="inflow" fill={chart.success} radius={[4, 4, 0, 0]} maxBarSize={24} />
            <Bar dataKey="outflow" fill={chart.danger} radius={[4, 4, 0, 0]} maxBarSize={24} opacity={0.85} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
