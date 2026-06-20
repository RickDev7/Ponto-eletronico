"use client";

import { useTranslations } from "next-intl";
import { formatMoney } from "@/lib/finance/utils";
import type { CashflowMonth } from "@/actions/finance/actions";
import {
  KpiCard,
  OperationsPage,
  OperationsWorkspace,
  PageHeader,
} from "@/components/shared";
import { cn } from "@/lib/utils";

interface CashflowViewProps {
  months: CashflowMonth[];
  locale: string;
}

export function CashflowView({ months, locale }: CashflowViewProps) {
  const t = useTranslations("finance");
  const maxVal = Math.max(...months.map((m) => m.issuedCents), 1);
  const totalReceived = months.reduce((s, m) => s + m.receivedCents, 0);
  const totalPending = months.reduce((s, m) => s + m.pendingCents, 0);

  return (
    <OperationsPage>
      <PageHeader title={t("cashflow.title")} description={t("cashflow.description")} />

      <OperationsWorkspace>
        <div className="mb-6 grid gap-2 sm:grid-cols-3">
          <KpiCard label={t("cashflow.received12m")} value={formatMoney(totalReceived, "EUR", locale)} variant="strip" />
          <KpiCard label={t("cashflow.pending12m")} value={formatMoney(totalPending, "EUR", locale)} variant="strip" />
          <KpiCard label={t("cashflow.months")} value={12} variant="strip" />
        </div>

        <div className="rounded-xl border border-border/60 bg-card p-4">
          <div className="mb-4 flex flex-wrap gap-4 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1"><span className="size-2 rounded-sm bg-primary/40" />{t("cashflow.issued")}</span>
            <span className="flex items-center gap-1"><span className="size-2 rounded-sm bg-emerald-500" />{t("cashflow.received")}</span>
            <span className="flex items-center gap-1"><span className="size-2 rounded-sm bg-amber-500/60" />{t("cashflow.pending")}</span>
          </div>
          <div className="flex h-48 items-end gap-1">
            {months.map((month) => {
              const issuedH = (month.issuedCents / maxVal) * 100;
              const receivedH = (month.receivedCents / maxVal) * 100;
              const pendingH = (month.pendingCents / maxVal) * 100;
              return (
                <div key={month.key} className="group flex flex-1 flex-col items-center gap-1">
                  <div className="relative flex h-full w-full items-end justify-center gap-0.5">
                    <div className="w-1/3 rounded-t bg-primary/35" style={{ height: `${Math.max(issuedH, 4)}%` }} title={formatMoney(month.issuedCents, "EUR", locale)} />
                    <div className="w-1/3 rounded-t bg-emerald-500" style={{ height: `${Math.max(receivedH, 4)}%` }} />
                    <div className="w-1/3 rounded-t bg-amber-500/60" style={{ height: `${Math.max(pendingH, 4)}%` }} />
                  </div>
                  <span className={cn("text-[9px] text-muted-foreground")}>{month.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </OperationsWorkspace>
    </OperationsPage>
  );
}
