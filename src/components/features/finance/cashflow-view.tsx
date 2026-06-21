"use client";

import { useTranslations } from "next-intl";
import { formatMoney } from "@/lib/finance/utils";
import type { FinanceCashflowAnalytics } from "@/lib/finance/cashflow-analytics-data";
import {
  KpiCard,
  OperationsPage,
  OperationsWorkspace,
  PageHeader,
} from "@/components/shared";
import { cn } from "@/lib/utils";

interface CashflowViewProps {
  data: FinanceCashflowAnalytics;
  locale: string;
}

export function CashflowView({ data, locale }: CashflowViewProps) {
  const t = useTranslations("finance.cashflow");
  const maxVal = Math.max(...data.months.map((m) => Math.max(m.inflowCents, m.outflowCents)), 1);

  return (
    <OperationsPage>
      <PageHeader title={t("title")} description={t("description")} />

      <OperationsWorkspace>
        <div className="mb-6 grid gap-2 sm:grid-cols-3">
          <KpiCard
            label={t("inflow12m")}
            value={formatMoney(data.totalInflowCents, "EUR", locale)}
            variant="strip"
          />
          <KpiCard
            label={t("outflow12m")}
            value={formatMoney(data.totalOutflowCents, "EUR", locale)}
            variant="strip"
          />
          <KpiCard
            label={t("net12m")}
            value={formatMoney(data.netCashflowCents, "EUR", locale)}
            variant="strip"
          />
        </div>

        <div className="rounded-xl border border-border/60 bg-card p-4">
          <div className="mb-4 flex flex-wrap gap-4 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="size-2 rounded-sm bg-emerald-500" />
              {t("inflow")}
            </span>
            <span className="flex items-center gap-1">
              <span className="size-2 rounded-sm bg-rose-500" />
              {t("outflow")}
            </span>
            <span className="flex items-center gap-1">
              <span className="size-2 rounded-sm bg-primary" />
              {t("balance")}
            </span>
          </div>
          <div className="flex h-52 items-end gap-1">
            {data.months.map((month) => {
              const inH = (month.inflowCents / maxVal) * 100;
              const outH = (month.outflowCents / maxVal) * 100;
              return (
                <div key={month.key} className="group flex flex-1 flex-col items-center gap-1">
                  <div className="relative flex h-full w-full items-end justify-center gap-0.5">
                    <div
                      className="w-2/5 rounded-t bg-emerald-500"
                      style={{ height: `${Math.max(inH, 4)}%` }}
                      title={formatMoney(month.inflowCents, "EUR", locale)}
                    />
                    <div
                      className="w-2/5 rounded-t bg-rose-500/80"
                      style={{ height: `${Math.max(outH, 4)}%` }}
                      title={formatMoney(month.outflowCents, "EUR", locale)}
                    />
                  </div>
                  <span className={cn("text-[9px] text-muted-foreground")}>{month.label}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-4 border-t border-border/40 pt-3">
            <p className="text-xs text-muted-foreground">{t("balanceHint")}</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">
              {formatMoney(data.months[data.months.length - 1]?.balanceCents ?? 0, "EUR", locale)}
            </p>
          </div>
        </div>
      </OperationsWorkspace>
    </OperationsPage>
  );
}
