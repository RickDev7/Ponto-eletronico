"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { FinanceChartPoint } from "@/lib/finance/dashboard-data";
import { formatMoney } from "@/lib/finance/utils";
import { cn } from "@/lib/utils";

type ChartRange = "30d" | "90d" | "12m" | "ytd";

interface FinanceRevenueChartProps {
  points: FinanceChartPoint[];
  locale: string;
}

export function FinanceRevenueChart({ points, locale }: FinanceRevenueChartProps) {
  const t = useTranslations("finance.dashboard");
  const [range, setRange] = useState<ChartRange>("12m");

  const filtered = useMemo(() => {
    const year = new Date().getFullYear().toString();
    switch (range) {
      case "30d":
        return points.slice(-1);
      case "90d":
        return points.slice(-3);
      case "ytd":
        return points.filter((p) => p.key.startsWith(year));
      default:
        return points;
    }
  }, [points, range]);

  const chartData = filtered.map((p) => ({
    name: p.label,
    revenue: p.revenue / 100,
    expenses: p.expenses / 100,
    profit: p.profit / 100,
  }));

  const ranges: { id: ChartRange; label: string }[] = [
    { id: "30d", label: t("chart.range30d") },
    { id: "90d", label: t("chart.range90d") },
    { id: "12m", label: t("chart.range12m") },
    { id: "ytd", label: t("chart.rangeYtd") },
  ];

  return (
    <div className="rounded-xl border border-border/60 bg-card p-4 sm:p-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold tracking-tight">{t("chart.title")}</h3>
          <p className="text-xs text-muted-foreground">{t("chart.subtitle")}</p>
        </div>
        <div className="flex flex-wrap gap-1 rounded-lg border border-border/60 bg-muted/30 p-0.5">
          {ranges.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setRange(r.id)}
              className={cn(
                "rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors",
                range === r.id
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="h-64 w-full sm:h-72">
        {chartData.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            {t("chart.empty")}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgb(16, 185, 129)" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="rgb(16, 185, 129)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `€${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                width={44}
              />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(value: number, name: string) => [
                  formatMoney(Math.round(value * 100), "EUR", locale),
                  name === "revenue"
                    ? t("chart.revenue")
                    : name === "expenses"
                      ? t("chart.expenses")
                      : t("chart.profit"),
                ]}
              />
              <Legend
                wrapperStyle={{ fontSize: 11, paddingTop: 12 }}
                formatter={(value) =>
                  value === "revenue"
                    ? t("chart.revenue")
                    : value === "expenses"
                      ? t("chart.expenses")
                      : t("chart.profit")
                }
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="rgb(16, 185, 129)"
                strokeWidth={2}
                fill="url(#revenueGrad)"
              />
              <Line
                type="monotone"
                dataKey="expenses"
                stroke="rgb(244, 63, 94)"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="profit"
                stroke="rgb(59, 130, 246)"
                strokeWidth={2}
                dot={false}
                strokeDasharray="4 4"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
