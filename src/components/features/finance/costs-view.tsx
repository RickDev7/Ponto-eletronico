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
  const maxTax = useMemo(
    () => Math.max(...data.monthlyBuckets.map((b) => b.taxCents), 1),
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
          className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
        >
          <KpiCard label={t("kpi.tax")} value={formatMoney(data.taxPayableCents, "EUR", locale)} variant="strip" />
          <KpiCard label={t("kpi.discounts")} value={formatMoney(data.discountsCents, "EUR", locale)} variant="strip" />
          <KpiCard
            label={t("kpi.unbilled")}
            value={String(data.unbilledExecutionsCount)}
            hint={formatMoney(data.unbilledExecutionsCents, "EUR", locale)}
            variant="strip"
          />
          <KpiCard
            label={t("kpi.operationalLoad")}
            value={`${Math.round(data.operationalMinutes / 60)}h`}
            hint={t("kpi.approvedTasks", { count: data.approvedExecutionsCount })}
            variant="strip"
          />
        </motion.div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-border/60 bg-card p-4">
            <h3 className="mb-1 text-sm font-semibold">{t("chart.taxTitle")}</h3>
            <p className="mb-4 text-xs text-muted-foreground">{t("chart.taxHint")}</p>
            <div className="flex h-40 items-end gap-1">
              {data.monthlyBuckets.map((bucket) => (
                <div key={bucket.key} className="flex flex-1 flex-col items-center gap-1">
                  <div
                    className="w-full rounded-t bg-rose-500/70"
                    style={{ height: `${Math.max((bucket.taxCents / maxTax) * 100, 4)}%` }}
                    title={formatMoney(bucket.taxCents, "EUR", locale)}
                  />
                  <span className="text-[9px] text-muted-foreground">{bucket.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border/60 bg-card p-4">
            <h3 className="mb-1 text-sm font-semibold">{t("executions.title")}</h3>
            <p className="mb-4 text-xs text-muted-foreground">{t("executions.hint")}</p>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between border-b border-border/40 pb-2">
                <dt className="text-muted-foreground">{t("executions.approved")}</dt>
                <dd className="font-medium tabular-nums">{data.approvedExecutionsCount}</dd>
              </div>
              <div className="flex justify-between border-b border-border/40 pb-2">
                <dt className="text-muted-foreground">{t("executions.billed")}</dt>
                <dd className="font-medium tabular-nums">{data.billedExecutionsCount}</dd>
              </div>
              <div className="flex justify-between border-b border-border/40 pb-2">
                <dt className="text-muted-foreground">{t("executions.unbilled")}</dt>
                <dd className="font-medium tabular-nums text-amber-600 dark:text-amber-400">
                  {data.unbilledExecutionsCount}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{t("executions.atRisk")}</dt>
                <dd className="font-semibold tabular-nums">
                  {formatMoney(data.unbilledExecutionsCents, "EUR", locale)}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </OperationsWorkspace>
    </OperationsPage>
  );
}
