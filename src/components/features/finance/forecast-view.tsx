"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { TrendingUp } from "lucide-react";
import { formatMoney } from "@/lib/finance/utils";
import type { FinanceForecastData } from "@/lib/finance/forecast-data";
import {
  KpiCard,
  OperationsPage,
  OperationsWorkspace,
  PageHeader,
} from "@/components/shared";

interface ForecastViewProps {
  data: FinanceForecastData;
  locale: string;
}

const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

export function ForecastView({ data, locale }: ForecastViewProps) {
  const t = useTranslations("finance.forecastPage");
  const maxBucket = useMemo(
    () => Math.max(...data.monthlyBuckets.map((b) => b.totalCents), 1),
    [data.monthlyBuckets],
  );

  const periods = [
    {
      label: t("periods.days30"),
      total: data.days30Cents,
      contracts: data.contractRecurring30Cents,
      receivables: data.receivables30Cents,
    },
    {
      label: t("periods.days60"),
      total: data.days60Cents,
      contracts: data.contractRecurring60Cents,
      receivables: data.receivables60Cents,
    },
    {
      label: t("periods.days90"),
      total: data.days90Cents,
      contracts: data.contractRecurring90Cents,
      receivables: data.receivables90Cents,
    },
  ];

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
          <KpiCard label={t("kpi.mrr")} value={formatMoney(data.mrrCents, "EUR", locale)} variant="strip" />
          {periods.map((p) => (
            <KpiCard
              key={p.label}
              label={p.label}
              value={formatMoney(p.total, "EUR", locale)}
              hint={t("kpi.breakdown", {
                contracts: formatMoney(p.contracts, "EUR", locale),
                receivables: formatMoney(p.receivables, "EUR", locale),
              })}
              variant="strip"
            />
          ))}
        </motion.div>

        <div className="grid gap-4 lg:grid-cols-12">
          <div className="lg:col-span-7 rounded-xl border border-blue-500/20 bg-gradient-to-br from-blue-500/[0.05] to-card p-4">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-blue-500/10">
                <TrendingUp className="size-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">{t("chart.title")}</h3>
                <p className="text-xs text-muted-foreground">{t("chart.hint")}</p>
              </div>
            </div>
            <div className="flex h-48 items-end gap-3">
              {data.monthlyBuckets.map((bucket) => (
                <div key={bucket.date} className="flex flex-1 flex-col items-center gap-1">
                  <div className="flex h-full w-full items-end justify-center gap-0.5">
                    <div
                      className="w-1/2 rounded-t bg-blue-500/60"
                      style={{ height: `${Math.max((bucket.contractCents / maxBucket) * 100, 4)}%` }}
                      title={formatMoney(bucket.contractCents, "EUR", locale)}
                    />
                    <div
                      className="w-1/2 rounded-t bg-emerald-500/60"
                      style={{ height: `${Math.max((bucket.receivableCents / maxBucket) * 100, 4)}%` }}
                      title={formatMoney(bucket.receivableCents, "EUR", locale)}
                    />
                  </div>
                  <span className="text-center text-[9px] leading-tight text-muted-foreground">
                    {bucket.label}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-3 flex gap-4 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="size-2 rounded-sm bg-blue-500/60" />
                {t("chart.contracts")}
              </span>
              <span className="flex items-center gap-1">
                <span className="size-2 rounded-sm bg-emerald-500/60" />
                {t("chart.receivables")}
              </span>
            </div>
          </div>

          <div className="lg:col-span-5 space-y-3">
            {periods.map((p) => (
              <div key={p.label} className="rounded-xl border border-border/60 bg-card p-4">
                <p className="text-xs text-muted-foreground">{p.label}</p>
                <p className="mt-1 text-xl font-semibold tabular-nums">
                  {formatMoney(p.total, "EUR", locale)}
                </p>
                <dl className="mt-3 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">{t("sources.contracts")}</dt>
                    <dd className="font-medium tabular-nums">{formatMoney(p.contracts, "EUR", locale)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">{t("sources.receivables")}</dt>
                    <dd className="font-medium tabular-nums">{formatMoney(p.receivables, "EUR", locale)}</dd>
                  </div>
                </dl>
              </div>
            ))}
          </div>
        </div>
      </OperationsWorkspace>
    </OperationsPage>
  );
}
