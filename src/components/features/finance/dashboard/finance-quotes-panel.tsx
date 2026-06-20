"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ROUTES } from "@/config/constants";
import type { FinanceQuoteStats } from "@/lib/finance/dashboard-data";

interface FinanceQuotesPanelProps {
  slug: string;
  stats: FinanceQuoteStats;
}

export function FinanceQuotesPanel({ slug, stats }: FinanceQuotesPanelProps) {
  const t = useTranslations("finance.dashboard");

  const items = [
    { key: "sent", value: stats.sent, color: "bg-blue-500" },
    { key: "accepted", value: stats.accepted, color: "bg-emerald-500" },
    { key: "rejected", value: stats.rejected, color: "bg-rose-500" },
    { key: "pending", value: stats.pending, color: "bg-zinc-400" },
  ];

  const total = items.reduce((s, i) => s + i.value, 0) || 1;

  return (
    <div className="rounded-xl border border-border/60 bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">{t("quotes.title")}</h3>
        <Link href={ROUTES.financeQuotes(slug)} className="text-xs text-primary hover:underline">
          {t("quotes.viewAll")}
        </Link>
      </div>

      <div className="mb-4 flex h-2 overflow-hidden rounded-full bg-muted">
        {items.map((item) =>
          item.value > 0 ? (
            <div
              key={item.key}
              className={item.color}
              style={{ width: `${(item.value / total) * 100}%` }}
            />
          ) : null,
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        {items.map((item) => (
          <div key={item.key} className="rounded-lg bg-muted/40 px-2.5 py-2">
            <p className="text-lg font-semibold tabular-nums">{item.value}</p>
            <p className="text-[10px] text-muted-foreground">
              {t(`quotes.${item.key}` as "quotes.sent")}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-lg border border-border/50 bg-muted/20 px-3 py-2.5 text-center">
        <p className="text-2xl font-bold tabular-nums">{stats.conversionRate}%</p>
        <p className="text-[11px] text-muted-foreground">{t("quotes.conversion")}</p>
      </div>
    </div>
  );
}
