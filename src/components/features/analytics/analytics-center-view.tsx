"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ArrowRight, Briefcase, LineChart as LineChartIcon, PieChart } from "lucide-react";
import { ROUTES } from "@/config/constants";
import type { AnalyticsCenterData } from "@/lib/analytics/analytics-center-types";
import { AnalyticsShell } from "@/components/features/analytics/analytics-shell";
import { AnalyticsPillarStrip } from "@/components/features/analytics/analytics-pillar-strip";
import { FinanceAnalyticsChart } from "@/components/features/finance/finance-analytics-chart";
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
import { chartTooltipStyle, useChartTheme } from "@/lib/charts/chart-theme";
import { formatMoney } from "@/lib/finance/utils";
import { AppShellPage } from "@/components/design-system/layout";
import { AiDomainWidget } from "@/components/features/ai/ai-domain-widget";

interface AnalyticsCenterViewProps {
  slug: string;
  data: AnalyticsCenterData;
  financeMonthly: Array<{
    label: string;
    receivedCents: number;
    costCents: number;
    profitCents: number;
  }>;
  locale: string;
}

const DASHBOARDS = [
  {
    key: "executive",
    href: (s: string) => ROUTES.analyticsExecutive(s),
    icon: PieChart,
    gradient: "from-violet-500/10",
  },
  {
    key: "operational",
    href: (s: string) => ROUTES.analyticsOperational(s),
    icon: Briefcase,
    gradient: "from-blue-500/10",
  },
  {
    key: "financial",
    href: (s: string) => ROUTES.analyticsFinancial(s),
    icon: LineChartIcon,
    gradient: "from-emerald-500/10",
  },
] as const;

function MiniUtilizationChart({
  data,
  locale,
}: {
  data: AnalyticsCenterData["utilization"]["monthly"];
  locale: string;
}) {
  const chart = useChartTheme();
  const tooltip = chartTooltipStyle(chart);
  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} vertical={false} />
        <XAxis dataKey="label" tick={{ fill: chart.axis, fontSize: 10 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: chart.axis, fontSize: 10 }} axisLine={false} tickLine={false} width={32} />
        <Tooltip {...tooltip} />
        <Bar dataKey="pct" fill={chart.primary} radius={[4, 4, 0, 0]} name="%" />
      </BarChart>
    </ResponsiveContainer>
  );
}

function MiniSlaChart({
  data,
}: {
  data: AnalyticsCenterData["sla"]["monthly"];
}) {
  const chart = useChartTheme();
  const tooltip = chartTooltipStyle(chart);
  return (
    <ResponsiveContainer width="100%" height={160}>
      <LineChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} vertical={false} />
        <XAxis dataKey="label" tick={{ fill: chart.axis, fontSize: 10 }} axisLine={false} tickLine={false} />
        <YAxis domain={[0, 100]} tick={{ fill: chart.axis, fontSize: 10 }} axisLine={false} tickLine={false} width={32} />
        <Tooltip {...tooltip} />
        <Line type="monotone" dataKey="compliancePct" stroke="#f59e0b" strokeWidth={2} dot={false} name="%" />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function AnalyticsCenterView({
  slug,
  data,
  financeMonthly,
  locale,
}: AnalyticsCenterViewProps) {
  const t = useTranslations("analytics");

  return (
    <AppShellPage size="fluid">
      <AnalyticsShell slug={slug}>
        <AnalyticsPillarStrip data={data} locale={locale} />

        <AiDomainWidget slug={slug} domain="analytics" compact className="mb-4" />

        <div className="grid gap-4 md:grid-cols-3">
          {DASHBOARDS.map(({ key, href, icon: Icon, gradient }) => (
            <Link
              key={key}
              href={href(slug)}
              className={`group rounded-xl border border-border/60 bg-gradient-to-br ${gradient} to-card p-5 transition-shadow hover:shadow-md`}
            >
              <div className="flex items-center justify-between">
                <Icon className="size-8 text-primary/60" />
                <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </div>
              <h3 className="mt-4 text-sm font-semibold">{t(`dashboards.${key}.title`)}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{t(`dashboards.${key}.description`)}</p>
            </Link>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-border/60 bg-card p-4">
            <h3 className="mb-3 text-sm font-semibold">{t("charts.utilization")}</h3>
            <MiniUtilizationChart data={data.utilization.monthly} locale={locale} />
          </div>
          <div className="rounded-xl border border-border/60 bg-card p-4">
            <h3 className="mb-3 text-sm font-semibold">{t("charts.sla")}</h3>
            <MiniSlaChart data={data.sla.monthly} />
          </div>
        </div>

        <div className="rounded-xl border border-border/60 bg-card p-4">
          <h3 className="mb-3 text-sm font-semibold">{t("charts.revenueProfit")}</h3>
          <FinanceAnalyticsChart
            data={financeMonthly.map((m) => ({
              key: m.label,
              label: m.label,
              revenueCents: m.receivedCents,
              receivedCents: m.receivedCents,
              costCents: m.costCents,
              profitCents: m.profitCents,
              marginPct: 0,
              inflowCents: 0,
              outflowCents: 0,
              netCashflowCents: 0,
            }))}
            locale={locale}
            labels={{
              revenue: t("pillars.revenue"),
              costs: t("charts.costs"),
              profit: t("charts.profit"),
            }}
            height={220}
          />
        </div>
      </AnalyticsShell>
    </AppShellPage>
  );
}
