"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ROUTES } from "@/config/constants";
import { formatDate, formatMoney } from "@/lib/finance/utils";
import type { FinanceContractRow } from "@/lib/finance/dashboard-data";
import { StatusBadge } from "@/components/shared";
import { EmptyState } from "@/components/shared";

interface FinanceContractsPanelProps {
  slug: string;
  contracts: FinanceContractRow[];
  locale: string;
}

export function FinanceContractsPanel({ slug, contracts, locale }: FinanceContractsPanelProps) {
  const t = useTranslations("finance.dashboard");

  return (
    <div className="rounded-xl border border-border/60 bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">{t("contracts.title")}</h3>
          <p className="text-xs text-muted-foreground">{t("contracts.subtitle")}</p>
        </div>
        <Link href={ROUTES.financeContracts(slug)} className="text-xs text-primary hover:underline">
          {t("contracts.viewAll")}
        </Link>
      </div>

      {contracts.length === 0 ? (
        <EmptyState title={t("contracts.empty")} />
      ) : (
        <div className="space-y-2">
          {contracts.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-border/40 px-3 py-2.5 transition-colors hover:bg-muted/30"
            >
              <div className="min-w-0">
                <p className="truncate text-xs font-medium">{c.client_name}</p>
                <p className="truncate text-[11px] text-muted-foreground">{c.title}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-xs font-semibold tabular-nums">
                  {formatMoney(c.amount_cents, "EUR", locale)}
                  <span className="text-muted-foreground font-normal">/mo</span>
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {c.next_invoice_date
                    ? formatDate(c.next_invoice_date, locale)
                    : "—"}
                </p>
              </div>
              <StatusBadge
                status={c.is_active ? "success" : "neutral"}
                label={c.is_active ? t("contracts.active") : t("contracts.paused")}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
