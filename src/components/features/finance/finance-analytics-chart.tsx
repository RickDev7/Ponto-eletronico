"use client";

import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { chartTooltipStyle, useChartTheme } from "@/lib/charts/chart-theme";
import { formatMoney } from "@/lib/finance/utils";
import type { AnalyticsMonthBucket } from "@/lib/finance/analytics-types";

interface FinanceAnalyticsChartProps {
  data: AnalyticsMonthBucket[];
  locale: string;
  labels: {
    revenue: string;
    costs: string;
    profit: string;
  };
  height?: number;
}

export function FinanceAnalyticsChart({
  data,
  locale,
  labels,
  height = 280,
}: FinanceAnalyticsChartProps) {
  const chart = useChartTheme();
  const tooltip = chartTooltipStyle(chart);

  const chartData = useMemo(
    () =>
      data.map((m) => ({
        name: m.label,
        revenue: m.receivedCents / 100,
        costs: m.costCents / 100,
        profit: m.profitCents / 100,
      })),
    [data],
  );

  return (
    <div className="rounded-xl border border-border/60 bg-gradient-to-br from-primary/[0.03] to-card p-4">
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={chart.primary} stopOpacity={0.35} />
              <stop offset="100%" stopColor={chart.primary} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} vertical={false} />
          <XAxis dataKey="name" tick={{ fill: chart.axis, fontSize: 10 }} axisLine={false} tickLine={false} />
          <YAxis
            tick={{ fill: chart.axis, fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => formatMoney(Math.round(v * 100), "EUR", locale)}
            width={72}
          />
          <Tooltip
            {...tooltip}
            formatter={(value: number, name: string) => [
              formatMoney(Math.round(value * 100), "EUR", locale),
              name === "revenue" ? labels.revenue : name === "costs" ? labels.costs : labels.profit,
            ]}
          />
          <Area type="monotone" dataKey="revenue" stroke={chart.primary} fill="url(#revenueGrad)" strokeWidth={2} />
          <Area type="monotone" dataKey="costs" stroke="#f43f5e" fill="transparent" strokeWidth={1.5} strokeDasharray="4 4" />
          <Area type="monotone" dataKey="profit" stroke="#10b981" fill="url(#profitGrad)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
      <div className="mt-3 flex flex-wrap gap-4 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-primary" />
          {labels.revenue}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-rose-500" />
          {labels.costs}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-emerald-500" />
          {labels.profit}
        </span>
      </div>
    </div>
  );
}
