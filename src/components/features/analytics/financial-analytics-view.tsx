"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import type { AnalyticsCenterData } from "@/lib/analytics/analytics-center-types";
import { AnalyticsShell } from "@/components/features/analytics/analytics-shell";
import { AnalyticsPillarStrip } from "@/components/features/analytics/analytics-pillar-strip";
import { FinanceAnalyticsChart } from "@/components/features/finance/finance-analytics-chart";
import { formatMoney } from "@/lib/finance/utils";
import { AppShellPage } from "@/components/design-system/layout";
import { cn } from "@/lib/utils";

interface FinancialAnalyticsViewProps {
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

const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

function RankRow({
  rank,
  name,
  revenueCents,
  marginPct,
  locale,
}: {
  rank: number;
  name: string;
  revenueCents: number;
  marginPct: number;
  locale: string;
}) {
  const positive = marginPct >= 0;
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border/40 px-3 py-2.5">
      <div className="flex min-w-0 items-center gap-2">
        <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-muted text-[10px] font-semibold">
          {rank}
        </span>
        <p className="truncate text-sm font-medium">{name}</p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-sm font-semibold tabular-nums">{formatMoney(revenueCents, "EUR", locale)}</p>
        <p className={cn("flex items-center justify-end gap-0.5 text-[10px]", positive ? "text-emerald-600" : "text-rose-600")}>
          {positive ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
          {marginPct}%
        </p>
      </div>
    </div>
  );
}

export function FinancialAnalyticsView({
  slug,
  data,
  financeMonthly,
  locale,
}: FinancialAnalyticsViewProps) {
  const t = useTranslations("analytics.financial");

  return (
    <AppShellPage size="fluid">
      <AnalyticsShell slug={slug} title={t("title")} description={t("description")}>
        <motion.div initial="hidden" animate="show" variants={fadeUp} className="space-y-6">
          <AnalyticsPillarStrip
            data={data}
            locale={locale}
            highlight={["revenue", "profitability"]}
          />

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-border/60 bg-card p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t("received")}</p>
              <p className="mt-2 text-xl font-semibold tabular-nums">
                {formatMoney(data.revenue.receivedYtdCents, "EUR", locale)}
              </p>
            </div>
            <div className="rounded-xl border border-border/60 bg-card p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t("invoiced")}</p>
              <p className="mt-2 text-xl font-semibold tabular-nums">
                {formatMoney(data.revenue.invoicedYtdCents, "EUR", locale)}
              </p>
            </div>
            <div className="rounded-xl border border-border/60 bg-card p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t("mrr")}</p>
              <p className="mt-2 text-xl font-semibold tabular-nums">
                {formatMoney(data.revenue.mrrCents, "EUR", locale)}
              </p>
            </div>
            <div className="rounded-xl border border-border/60 bg-card p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t("margin")}</p>
              <p className="mt-2 text-xl font-semibold tabular-nums text-violet-600">
                {data.profitability.grossMarginPct}%
              </p>
              <p className="text-[10px] text-muted-foreground">
                {formatMoney(data.profitability.grossProfitCents, "EUR", locale)}
              </p>
            </div>
          </div>

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
              revenue: t("chartRevenue"),
              costs: t("chartCosts"),
              profit: t("chartProfit"),
            }}
          />

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-border/60 bg-card p-4">
              <h3 className="mb-3 text-sm font-semibold">{t("byClient")}</h3>
              <div className="space-y-2">
                {data.profitability.topClients.length === 0 ? (
                  <p className="text-xs text-muted-foreground">{t("empty")}</p>
                ) : (
                  data.profitability.topClients.map((row, i) => (
                    <RankRow
                      key={row.id}
                      rank={i + 1}
                      name={row.name}
                      revenueCents={row.revenueCents}
                      marginPct={row.marginPct}
                      locale={locale}
                    />
                  ))
                )}
              </div>
            </div>
            <div className="rounded-xl border border-border/60 bg-card p-4">
              <h3 className="mb-3 text-sm font-semibold">{t("byService")}</h3>
              <div className="space-y-2">
                {data.profitability.topServices.length === 0 ? (
                  <p className="text-xs text-muted-foreground">{t("empty")}</p>
                ) : (
                  data.profitability.topServices.map((row, i) => (
                    <RankRow
                      key={row.id}
                      rank={i + 1}
                      name={row.name}
                      revenueCents={row.revenueCents}
                      marginPct={row.marginPct}
                      locale={locale}
                    />
                  ))
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </AnalyticsShell>
    </AppShellPage>
  );
}
