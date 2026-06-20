"use client";

import { useTranslations } from "next-intl";
import { formatDate, formatMoney } from "@/lib/finance/utils";
import type { CreateQuoteInput } from "@/lib/validations/finance";

interface QuotePreviewCompany {
  name: string;
  legalName?: string | null;
  taxId?: string | null;
  email?: string | null;
  phone?: string | null;
  logoUrl?: string | null;
}

interface QuotePreviewPanelProps {
  company: QuotePreviewCompany;
  values: Partial<CreateQuoteInput>;
  totals: {
    subtotalCents: number;
    discountCents: number;
    taxRate: number;
    taxCents: number;
    totalCents: number;
  };
  locale: string;
}

export function QuotePreviewPanel({
  company,
  values,
  totals,
  locale,
}: QuotePreviewPanelProps) {
  const t = useTranslations("finance");

  const items = values.items ?? [];

  return (
    <div className="sticky top-4 space-y-4 rounded-xl border border-border/60 bg-card p-5 shadow-sm">
      <div className="border-b border-border/60 pb-4">
        {company.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={company.logoUrl} alt="" className="mb-3 max-h-10 object-contain" />
        ) : (
          <p className="text-base font-semibold tracking-tight">{company.name}</p>
        )}
        <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
          {company.legalName && <span>{company.legalName}<br /></span>}
          {company.taxId && <span>NIF: {company.taxId}<br /></span>}
          {company.email}
          {company.phone && ` · ${company.phone}`}
        </p>
      </div>

      <div>
        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {t("pdf.to")}
        </p>
        <p className="mt-1 text-sm font-medium">{values.clientName || "—"}</p>
        {values.clientCompany && (
          <p className="text-xs text-muted-foreground">{values.clientCompany}</p>
        )}
        {values.clientEmail && (
          <p className="text-xs text-muted-foreground">{values.clientEmail}</p>
        )}
        {values.clientPhone && (
          <p className="text-xs text-muted-foreground">{values.clientPhone}</p>
        )}
        {values.clientAddress && (
          <p className="text-xs text-muted-foreground">{values.clientAddress}</p>
        )}
      </div>

      <div className="space-y-2 border-t border-border/60 pt-3">
        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {t("form.servicesSection")}
        </p>
        {items.length === 0 ? (
          <p className="text-xs text-muted-foreground">{t("quotes.emptyHint")}</p>
        ) : (
          items.map((item, i) => (
            <div key={i} className="flex justify-between gap-2 text-xs">
              <span className="min-w-0 truncate text-foreground">
                {item.description || "—"}
              </span>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                {formatMoney(
                  Math.round(
                    Number(item.quantity ?? 0) *
                      Number(item.unitPriceCents ?? 0) *
                      (1 - Number(item.discountPercent ?? 0) / 100),
                  ),
                  "EUR",
                  locale,
                )}
              </span>
            </div>
          ))
        )}
      </div>

      <div className="space-y-1.5 border-t border-border/60 pt-3 text-sm">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">{t("form.subtotal")}</span>
          <span className="tabular-nums">{formatMoney(totals.subtotalCents, "EUR", locale)}</span>
        </div>
        {totals.discountCents > 0 && (
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">{t("form.discount")}</span>
            <span className="tabular-nums text-rose-600">
              −{formatMoney(totals.discountCents, "EUR", locale)}
            </span>
          </div>
        )}
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">{t("form.tax")} ({totals.taxRate}%)</span>
          <span className="tabular-nums">{formatMoney(totals.taxCents, "EUR", locale)}</span>
        </div>
        <div className="flex justify-between border-t border-border/60 pt-2 font-semibold">
          <span>{t("form.total")}</span>
          <span className="tabular-nums">{formatMoney(totals.totalCents, "EUR", locale)}</span>
        </div>
      </div>

      {(values.issueDate || values.validUntil) && (
        <div className="border-t border-border/60 pt-3 text-[11px] text-muted-foreground">
          {values.issueDate && (
            <p>{t("pdf.date")}: {formatDate(values.issueDate, locale)}</p>
          )}
          {values.validUntil && (
            <p>{t("pdf.validUntil")}: {formatDate(values.validUntil, locale)}</p>
          )}
        </div>
      )}

      {values.notes && (
        <div className="rounded-lg bg-muted/40 p-3 text-[11px] text-muted-foreground">
          <p className="mb-1 font-medium text-foreground">{t("form.notes")}</p>
          {values.notes}
        </div>
      )}
    </div>
  );
}
