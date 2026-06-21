"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { AnalyticsCenterData } from "@/lib/analytics/analytics-center-types";
import { AnalyticsShell } from "@/components/features/analytics/analytics-shell";
import { AnalyticsPillarStrip } from "@/components/features/analytics/analytics-pillar-strip";
import { chartTooltipStyle, useChartTheme } from "@/lib/charts/chart-theme";
import { AppShellPage } from "@/components/design-system/layout";
import { cn } from "@/lib/utils";

interface OperationalAnalyticsViewProps {
  slug: string;
  data: AnalyticsCenterData;
  locale: string;
  embedded?: boolean;
}

const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

function RankList({
  title,
  rows,
  valueKey,
  suffix,
}: {
  title: string;
  rows: Array<{ id: string; name: string; completedTasks: number; hoursWorked: number; utilizationPct: number }>;
  valueKey: "completedTasks" | "hoursWorked" | "utilizationPct";
  suffix?: string;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-4">
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-xs text-muted-foreground">—</p>
      ) : (
        <div className="space-y-2">
          {rows.map((row, i) => (
            <div key={row.id} className="flex items-center justify-between gap-2 text-sm">
              <div className="flex min-w-0 items-center gap-2">
                <span className="flex size-5 shrink-0 items-center justify-center rounded bg-muted text-[10px] font-semibold">
                  {i + 1}
                </span>
                <span className="truncate">{row.name}</span>
              </div>
              <span className="shrink-0 tabular-nums font-medium">
                {row[valueKey]}
                {suffix ?? ""}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function OperationalAnalyticsView({ slug, data, locale, embedded }: OperationalAnalyticsViewProps) {
  const t = useTranslations("analytics.operational");
  const chart = useChartTheme();
  const tooltip = chartTooltipStyle(chart);

  const utilizationChart = data.utilization.monthly.map((m) => ({
    name: m.label,
    planned: Math.round(m.plannedMinutes / 60),
    worked: Math.round(m.workedMinutes / 60),
    pct: m.pct,
  }));

  const body = (
    <AnalyticsShell slug={slug} title={t("title")} description={t("description")}>
      <motion.div initial="hidden" animate="show" variants={fadeUp} className="space-y-6">
          <AnalyticsPillarStrip
            data={data}
            locale={locale}
            highlight={["utilization", "sla", "workforce"]}
          />

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-border/60 bg-card p-4">
              <h3 className="mb-1 text-sm font-semibold">{t("utilizationChart")}</h3>
              <p className="mb-4 text-xs text-muted-foreground">{t("utilizationHint")}</p>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={utilizationChart} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: chart.axis, fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: chart.axis, fontSize: 10 }} axisLine={false} tickLine={false} width={36} />
                  <Tooltip {...tooltip} />
                  <Bar dataKey="planned" fill={chart.chart3} name={t("plannedHours")} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="worked" fill={chart.primary} name={t("workedHours")} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="rounded-xl border border-border/60 bg-card p-4">
              <h3 className="mb-1 text-sm font-semibold">{t("slaChart")}</h3>
              <p className="mb-4 text-xs text-muted-foreground">{t("slaHint")}</p>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={data.sla.monthly} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: chart.axis, fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fill: chart.axis, fontSize: 10 }} axisLine={false} tickLine={false} width={36} />
                  <Tooltip {...tooltip} />
                  <Line type="monotone" dataKey="compliancePct" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: t("slaOnTime"), value: data.sla.onTimeCount, accent: "text-emerald-600" },
              { label: t("slaLate"), value: data.sla.lateCount, accent: "text-amber-600" },
              { label: t("slaOverdue"), value: data.sla.overdueOpenCount, accent: "text-rose-600" },
              { label: t("invoiceCollection"), value: `${data.sla.invoiceCollectionPct}%`, accent: "text-primary" },
            ].map((kpi) => (
              <div key={kpi.label} className="rounded-xl border border-border/60 bg-card p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{kpi.label}</p>
                <p className={cn("mt-2 text-2xl font-semibold tabular-nums", kpi.accent)}>{kpi.value}</p>
              </div>
            ))}
          </div>

          <RankList
            title={t("topPerformers")}
            rows={data.workforce.topPerformers}
            valueKey="completedTasks"
          />
        </motion.div>
      </AnalyticsShell>
  );

  if (embedded) return body;

  return <AppShellPage size="fluid">{body}</AppShellPage>;
}
