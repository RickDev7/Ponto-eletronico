"use client";

import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Trophy } from "lucide-react";
import { formatMoney } from "@/lib/finance/utils";
import type { FinanceProfitabilityData, ProfitabilityRank } from "@/lib/finance/profitability-data";
import {
  KpiCard,
  OperationsPage,
  OperationsWorkspace,
  PageHeader,
} from "@/components/shared";

interface ProfitabilityViewProps {
  data: FinanceProfitabilityData;
  locale: string;
}

const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

function RankTable({
  title,
  rows,
  locale,
  emptyLabel,
}: {
  title: string;
  rows: ProfitabilityRank[];
  locale: string;
  emptyLabel: string;
}) {
  const t = useTranslations("finance.profitability");

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-border/60 bg-card p-4">
        <h3 className="mb-3 text-sm font-semibold">{title}</h3>
        <p className="text-xs text-muted-foreground">{emptyLabel}</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border/60 bg-card p-4">
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      <div className="space-y-2">
        {rows.map((row, index) => (
          <div
            key={row.id}
            className="flex items-center justify-between gap-3 rounded-lg border border-border/40 px-3 py-2.5"
          >
            <div className="flex min-w-0 items-center gap-2">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-muted text-[10px] font-semibold tabular-nums">
                {index === 0 ? <Trophy className="size-3 text-amber-500" /> : index + 1}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{row.name}</p>
                {row.subtitle && (
                  <p className="truncate text-[10px] text-muted-foreground">{row.subtitle}</p>
                )}
              </div>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-sm font-semibold tabular-nums">
                {formatMoney(row.receivedCents, "EUR", locale)}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {t("invoiced")}: {formatMoney(row.revenueCents, "EUR", locale)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ProfitabilityView({ data, locale }: ProfitabilityViewProps) {
  const t = useTranslations("finance.profitability");

  return (
    <OperationsPage>
      <PageHeader title={t("title")} description={t("description")} />

      <OperationsWorkspace>
        <motion.div
          initial="hidden"
          animate="show"
          variants={fadeUp}
          className="mb-6 grid gap-3 sm:grid-cols-2"
        >
          <KpiCard
            label={t("kpi.received")}
            value={formatMoney(data.totalReceivedCents, "EUR", locale)}
            variant="strip"
          />
          <KpiCard
            label={t("kpi.invoiced")}
            value={formatMoney(data.totalInvoicedCents, "EUR", locale)}
            variant="strip"
          />
        </motion.div>

        <div className="grid gap-4 lg:grid-cols-2">
          <RankTable
            title={t("topClient")}
            rows={data.topClients}
            locale={locale}
            emptyLabel={t("empty")}
          />
          <RankTable
            title={t("topContract")}
            rows={data.topContracts}
            locale={locale}
            emptyLabel={t("empty")}
          />
          <RankTable
            title={t("byService")}
            rows={data.byService}
            locale={locale}
            emptyLabel={t("empty")}
          />
          <RankTable
            title={t("byProperty")}
            rows={data.byProperty}
            locale={locale}
            emptyLabel={t("empty")}
          />
        </div>
      </OperationsWorkspace>
    </OperationsPage>
  );
}
