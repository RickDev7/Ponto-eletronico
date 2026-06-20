"use client";

import { useTranslations } from "next-intl";
import {
  advanceDateByFrequency,
  formatDate,
  formatMoney,
  type ContractFrequency,
} from "@/lib/finance/utils";
import type { CreateContractInput } from "@/lib/validations/finance";
import { monthlyAmountCents } from "@/lib/finance/contracts-data";

interface ContractPreviewCompany {
  name: string;
  legalName?: string | null;
  taxId?: string | null;
  email?: string | null;
  phone?: string | null;
  logoUrl?: string | null;
}

interface ContractPreviewPanelProps {
  company: ContractPreviewCompany;
  values: Partial<CreateContractInput>;
  totals: {
    subtotalCents: number;
    discountCents: number;
    taxRate: number;
    taxCents: number;
    totalCents: number;
  };
  locale: string;
}

export function ContractPreviewPanel({
  company,
  values,
  totals,
  locale,
}: ContractPreviewPanelProps) {
  const t = useTranslations("finance");
  const items = values.items ?? [];
  const frequency = (values.frequency ?? "monthly") as ContractFrequency;
  const monthlyCents = monthlyAmountCents({
    amount_cents: totals.totalCents,
    frequency,
  });
  const annualCents = monthlyCents * 12;

  const nextBilling =
    values.startDate && frequency
      ? formatDate(
          advanceDateByFrequency(new Date(values.startDate), frequency).toISOString().slice(0, 10),
          locale,
        )
      : "—";

  return (
    <div className="sticky top-4 space-y-4 rounded-xl border border-border/60 bg-card p-5 shadow-sm">
      <div>
        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {t("contracts.preview.title")}
        </p>
        <p className="mt-1 text-sm font-semibold">{values.title || "—"}</p>
      </div>

      <div className="border-t border-border/60 pt-3">
        {company.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={company.logoUrl} alt="" className="mb-3 max-h-10 object-contain" />
        ) : (
          <p className="text-base font-semibold tracking-tight">{company.name}</p>
        )}
      </div>

      <div>
        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {t("pdf.to")}
        </p>
        <p className="mt-1 text-sm font-medium">{values.clientName || "—"}</p>
        {values.clientCompany && (
          <p className="text-xs text-muted-foreground">{values.clientCompany}</p>
        )}
      </div>

      <div className="space-y-2 border-t border-border/60 pt-3">
        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {t("form.servicesSection")}
        </p>
        {items.map((item, i) => (
          <div key={i} className="flex justify-between gap-2 text-xs">
            <span className="min-w-0 truncate">{item.description || "—"}</span>
            <span className="shrink-0 tabular-nums text-muted-foreground">
              {formatMoney(
                Math.round(Number(item.quantity ?? 0) * Number(item.unitPriceCents ?? 0)),
                "EUR",
                locale,
              )}
            </span>
          </div>
        ))}
      </div>

      <div className="space-y-1.5 border-t border-border/60 pt-3 text-sm">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">{t("form.total")}</span>
          <span className="tabular-nums font-medium">
            {formatMoney(totals.totalCents, "EUR", locale)}
          </span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">{t("columns.frequency")}</span>
          <span>{t(`frequency.${frequency}`)}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">{t("contracts.preview.nextBilling")}</span>
          <span>{nextBilling}</span>
        </div>
        <div className="flex justify-between border-t border-border/60 pt-2 text-xs font-semibold">
          <span>{t("contracts.preview.monthly")}</span>
          <span className="tabular-nums">{formatMoney(monthlyCents, "EUR", locale)}</span>
        </div>
        <div className="flex justify-between text-xs font-semibold">
          <span>{t("contracts.preview.annual")}</span>
          <span className="tabular-nums">{formatMoney(annualCents, "EUR", locale)}</span>
        </div>
      </div>
    </div>
  );
}
