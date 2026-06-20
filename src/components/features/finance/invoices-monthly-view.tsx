"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/finance/utils";
import type { MonthlyBucket } from "@/lib/finance/invoices-data";

interface InvoicesMonthlyViewProps {
  buckets: MonthlyBucket[];
  activeMonth: string;
  locale: string;
  onSelectMonth: (key: string) => void;
}

export function InvoicesMonthlyView({
  buckets,
  activeMonth,
  locale,
  onSelectMonth,
}: InvoicesMonthlyViewProps) {
  const t = useTranslations("finance.invoices.monthly");

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {buckets.map((bucket) => {
        const isActive = bucket.key === activeMonth;
        return (
          <button
            key={bucket.key}
            type="button"
            suppressHydrationWarning
            onClick={() => onSelectMonth(bucket.key)}
            className={cn(
              "rounded-xl border p-4 text-left transition-colors hover:bg-muted/30",
              isActive
                ? "border-primary/40 bg-primary/5 ring-1 ring-primary/20"
                : "border-border/60 bg-card",
            )}
          >
            <p className="text-sm font-semibold capitalize">{bucket.label}</p>
            <div className="mt-3 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("issued")}</span>
                <span className="tabular-nums">{formatMoney(bucket.issuedCents, "EUR", locale)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("received")}</span>
                <span className="tabular-nums text-emerald-600 dark:text-emerald-400">
                  {formatMoney(bucket.receivedCents, "EUR", locale)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("pending")}</span>
                <span className="tabular-nums">{formatMoney(bucket.pendingCents, "EUR", locale)}</span>
              </div>
              {bucket.overdueCents > 0 && (
                <div className="flex justify-between text-rose-600 dark:text-rose-400">
                  <span>{t("overdue")}</span>
                  <span className="tabular-nums">{formatMoney(bucket.overdueCents, "EUR", locale)}</span>
                </div>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
