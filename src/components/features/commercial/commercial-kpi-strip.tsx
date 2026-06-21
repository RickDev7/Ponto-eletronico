"use client";

import { useTranslations } from "next-intl";
import { formatMoney } from "@/lib/finance/utils";
import type { CommercialHubKpis } from "@/lib/commercial/commercial-types";
import { FinanceKpiCard } from "@/components/features/finance/dashboard/finance-kpi-card";

interface CommercialKpiStripProps {
  kpis: CommercialHubKpis;
  locale: string;
}

export function CommercialKpiStrip({ kpis, locale }: CommercialKpiStripProps) {
  const t = useTranslations("commercial.hub.kpis");

  const items = [
    { id: "activeDeals", value: String(kpis.activeDeals), accent: "blue" as const },
    {
      id: "pipelineValue",
      value: formatMoney(kpis.pipelineValueCents, "EUR", locale),
      accent: "amber" as const,
    },
    { id: "awaitingApproval", value: String(kpis.awaitingApproval), accent: "rose" as const },
    { id: "openQuotes", value: String(kpis.openQuotes), accent: "neutral" as const },
    { id: "wonThisMonth", value: String(kpis.wonThisMonth), accent: "emerald" as const },
    { id: "conversionRate", value: `${kpis.conversionRate}%`, accent: "neutral" as const },
  ];

  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {items.map((item) => (
        <FinanceKpiCard
          key={item.id}
          label={t(item.id)}
          value={item.value}
          accent={item.accent}
        />
      ))}
    </div>
  );
}
