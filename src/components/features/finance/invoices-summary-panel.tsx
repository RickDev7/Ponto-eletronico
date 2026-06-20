"use client";

import { useTranslations } from "next-intl";
import { formatDate, formatMoney } from "@/lib/finance/utils";
import type { InvoiceListRow, RecentPaymentRow } from "@/lib/finance/invoices-data";

interface InvoicesSummaryPanelProps {
  locale: string;
  monthlyRevenueCents: number;
  projectedRevenueCents: number;
  dueThisWeek: InvoiceListRow[];
  overdueInvoices: InvoiceListRow[];
  recentPayments: RecentPaymentRow[];
}

export function InvoicesSummaryPanel({
  locale,
  monthlyRevenueCents,
  projectedRevenueCents,
  dueThisWeek,
  overdueInvoices,
  recentPayments,
}: InvoicesSummaryPanelProps) {
  const t = useTranslations("finance.invoices.sidebar");

  function invoiceLabel(p: RecentPaymentRow) {
    const inv = p.invoice;
    if (!inv) return "—";
    const row = Array.isArray(inv) ? inv[0] : inv;
    return row ? `${row.invoice_number} · ${row.client_name}` : "—";
  }

  return (
    <aside className="space-y-4">
      <div className="rounded-xl border border-border/60 bg-card p-4">
        <h3 className="mb-3 text-sm font-semibold">{t("title")}</h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("monthlyRevenue")}</span>
            <span className="font-semibold tabular-nums">
              {formatMoney(monthlyRevenueCents, "EUR", locale)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("projected")}</span>
            <span className="font-semibold tabular-nums">
              {formatMoney(projectedRevenueCents, "EUR", locale)}
            </span>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border/60 bg-card p-4">
        <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {t("dueThisWeek")}
        </h3>
        {dueThisWeek.length === 0 ? (
          <p className="text-xs text-muted-foreground">{t("none")}</p>
        ) : (
          <ul className="space-y-2">
            {dueThisWeek.slice(0, 5).map((inv) => (
              <li key={inv.id} className="text-xs">
                <p className="font-medium">{inv.client_name}</p>
                <p className="text-muted-foreground">
                  {formatDate(inv.due_date, locale)} · {formatMoney(inv.total_cents, "EUR", locale)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-xl border border-border/60 bg-card p-4">
        <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-rose-600 dark:text-rose-400">
          {t("overdue")}
        </h3>
        {overdueInvoices.length === 0 ? (
          <p className="text-xs text-muted-foreground">{t("none")}</p>
        ) : (
          <ul className="space-y-2">
            {overdueInvoices.slice(0, 5).map((inv) => (
              <li key={inv.id} className="text-xs">
                <p className="font-medium">{inv.client_name}</p>
                <p className="text-muted-foreground">
                  {formatMoney(inv.total_cents - inv.amount_paid_cents, "EUR", locale)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-xl border border-border/60 bg-card p-4">
        <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {t("recentPayments")}
        </h3>
        {recentPayments.length === 0 ? (
          <p className="text-xs text-muted-foreground">{t("none")}</p>
        ) : (
          <ul className="space-y-2">
            {recentPayments.map((p) => (
              <li key={p.id} className="flex justify-between gap-2 text-xs">
                <span className="min-w-0 truncate text-muted-foreground">{invoiceLabel(p)}</span>
                <span className="shrink-0 font-medium tabular-nums text-emerald-600 dark:text-emerald-400">
                  +{formatMoney(p.amount_cents, "EUR", locale)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
