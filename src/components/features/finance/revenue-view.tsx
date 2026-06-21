"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, TrendingUp } from "lucide-react";
import { formatMoney } from "@/lib/finance/utils";
import type { FinanceAnalyticsData } from "@/lib/finance/analytics-types";
import { FinanceAnalyticsChart } from "@/components/features/finance/finance-analytics-chart";
import {
  KpiCard,
  OperationsPage,
  OperationsWorkspace,
  PageHeader,
} from "@/components/shared";
import { cn } from "@/lib/utils";

interface RevenueViewProps {
  data: FinanceAnalyticsData;
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
        <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-muted text-[10px] font-semibold tabular-nums">
          {rank}
        </span>
        <p className="truncate text-sm font-medium">{name}</p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-sm font-semibold tabular-nums">
          {formatMoney(revenueCents, "EUR", locale)}
        </p>
        <p className={cn("flex items-center justify-end gap-0.5 text-[10px] tabular-nums", positive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
          {positive ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
          {marginPct}%
        </p>
      </div>
    </div>
  );
}

export function RevenueView({ data, locale }: RevenueViewProps) {
  const t = useTranslations("finance.revenue");

  return (
    <OperationsPage>
      <PageHeader title={t("title")} description={t("description")} />

      <OperationsWorkspace>
        <motion.div
          initial="hidden"
          animate="show"
          variants={fadeUp}
          className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
        >
          <KpiCard
            label={t("kpi.received")}
            value={formatMoney(data.summary.receivedCents, "EUR", locale)}
            variant="strip"
          />
          <KpiCard
            label={t("kpi.invoiced")}
            value={formatMoney(data.summary.invoicedCents, "EUR", locale)}
            variant="strip"
          />
          <KpiCard
            label={t("kpi.margin")}
            value={`${data.summary.grossMarginPct}%`}
            hint={formatMoney(data.summary.grossProfitCents, "EUR", locale)}
            variant="strip"
          />
          <KpiCard
            label={t("kpi.mrr")}
            value={formatMoney(data.summary.mrrCents, "EUR", locale)}
            variant="strip"
          />
        </motion.div>

        <motion.div initial="hidden" animate="show" variants={fadeUp} className="mb-6">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
              <TrendingUp className="size-4 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">{t("chart.title")}</h3>
              <p className="text-xs text-muted-foreground">{t("chart.hint")}</p>
            </div>
          </div>
          <FinanceAnalyticsChart
            data={data.monthly}
            locale={locale}
            labels={{
              revenue: t("chart.received"),
              costs: t("chart.costs"),
              profit: t("chart.profit"),
            }}
          />
        </motion.div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-border/60 bg-card p-4">
            <h3 className="mb-3 text-sm font-semibold">{t("byClient")}</h3>
            <div className="space-y-2">
              {data.byClient.length === 0 ? (
                <p className="text-xs text-muted-foreground">{t("empty")}</p>
              ) : (
                data.byClient.map((row, i) => (
                  <RankRow
                    key={row.id}
                    rank={i + 1}
                    name={row.name}
                    revenueCents={row.receivedCents}
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
              {data.byService.length === 0 ? (
                <p className="text-xs text-muted-foreground">{t("empty")}</p>
              ) : (
                data.byService.map((row, i) => (
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
      </OperationsWorkspace>
    </OperationsPage>
  );
}
