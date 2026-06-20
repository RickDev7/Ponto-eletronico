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
import { formatMoney } from "@/lib/finance/utils";
import type { ForecastMonth } from "@/lib/finance/contracts-data";

interface ContractForecastChartProps {
  data: ForecastMonth[];
  locale: string;
  totalLabel: string;
}

export function ContractForecastChart({ data, locale, totalLabel }: ContractForecastChartProps) {
  const chartData = useMemo(
    () => data.map((d) => ({ name: d.label, revenue: d.cents / 100 })),
    [data],
  );

  const totalCents = data.reduce((s, d) => s + d.cents, 0);

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <p className="text-xs text-muted-foreground">{totalLabel}</p>
        <p className="text-lg font-semibold tabular-nums">
          {formatMoney(totalCents, "EUR", locale)}
        </p>
      </div>
      <div className="h-[220px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="contractForecast" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis
              tick={{ fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `€${v}`}
            />
            <Tooltip
              formatter={(value: number) => formatMoney(Math.round(value * 100), "EUR", locale)}
              contentStyle={{
                borderRadius: 8,
                border: "1px solid hsl(var(--border))",
                background: "hsl(var(--card))",
                fontSize: 12,
              }}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="hsl(var(--primary))"
              fill="url(#contractForecast)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
