"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { formatMoney } from "@/lib/finance/utils";
import type { FinanceCostsData } from "@/lib/finance/costs-data";
import {
  KpiCard,
  OperationsPage,
  OperationsWorkspace,
  PageHeader,
} from "@/components/shared";

interface CostsViewProps {
  data: FinanceCostsData;
  locale: string;
}

const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

export function CostsView({ data, locale }: CostsViewProps) {
  const t = useTranslations("finance.costs");
  const maxCost = useMemo(
    () => Math.max(...data.monthlyBuckets.map((b) => b.costCents), 1),
    [data.monthlyBuckets],
  );

  return (
    <OperationsPage>
      <PageHeader title={t("title")} description={t("description")} />

      <OperationsWorkspace>
        <motion.div
          initial="hidden"
          animate="show"
          variants={fadeUp}
          className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
        >
          <KpiCard
            label={t("kpi.total")}
            value={formatMoney(data.totalCostCents, "EUR", locale)}
            variant="strip"
          />
          <KpiCard
            label={t("kpi.revenue")}
            value={formatMoney(data.revenueCents, "EUR", locale)}
            variant="strip"
          />
          <KpiCard
            label={t("kpi.margin")}
            value={`${data.grossMarginPct}%`}
            variant="strip"
          />
        </motion.div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-border/60 bg-card p-4">
            <h3 className="mb-1 text-sm font-semibold">{t("chart.title")}</h3>
            <p className="mb-4 text-xs text-muted-foreground">{t("chart.hint")}</p>
            <div className="flex h-40 items-end gap-1">
              {data.monthlyBuckets.map((bucket) => (
                <div key={bucket.key} className="flex flex-1 flex-col items-center gap-1">
                  <div
                    className="w-full rounded-t bg-rose-500/70"
                    style={{ height: `${Math.max((bucket.costCents / maxCost) * 100, 4)}%` }}
                    title={formatMoney(bucket.costCents, "EUR", locale)}
                  />
                  <span className="text-[9px] text-muted-foreground">{bucket.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border/60 bg-card p-4">
            <h3 className="mb-1 text-sm font-semibold">{t("breakdown.title")}</h3>
            <p className="mb-4 text-xs text-muted-foreground">{t("breakdown.hint")}</p>
            <dl className="space-y-3 text-sm">
              {data.costCategories.length === 0 ? (
                <p className="text-xs text-muted-foreground">{t("breakdown.empty")}</p>
              ) : (
                data.costCategories.map((cat) => (
                  <div key={cat.key} className="flex justify-between border-b border-border/40 pb-2">
                    <dt className="text-muted-foreground">{t(`categories.${cat.labelKey}`)}</dt>
                    <dd className="font-medium tabular-nums">
                      {formatMoney(cat.cents, "EUR", locale)}
                      <span className="ml-1 text-[10px] text-muted-foreground">({cat.pct}%)</span>
                    </dd>
                  </div>
                ))
              )}
            </dl>
          </div>
        </div>
      </OperationsWorkspace>
    </OperationsPage>
  );
}
