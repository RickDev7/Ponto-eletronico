"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ChevronRight, Plus } from "lucide-react";
import { ROUTES } from "@/config/constants";
import { formatDate, formatMoney } from "@/lib/finance/utils";
import type {
  CommercialActivityItem,
  CommercialDealRow,
  CommercialHubKpis,
  CommercialWorkflowStage,
} from "@/lib/commercial/commercial-types";
import { COMMERCIAL_WORKFLOW_STAGES } from "@/lib/commercial/commercial-types";
import { STAGE_DOT } from "@/lib/commercial/workflow";
import { CommercialKpiStrip } from "@/components/features/commercial/commercial-kpi-strip";
import { CommercialWorkflowStrip } from "@/components/features/commercial/commercial-workflow-strip";
import { OperationsPage, PageHeader } from "@/components/shared";
import { cn } from "@/lib/utils";

interface CommercialHubViewProps {
  slug: string;
  deals: CommercialDealRow[];
  kpis: CommercialHubKpis;
  byStage: Record<CommercialWorkflowStage, CommercialDealRow[]>;
  activity: CommercialActivityItem[];
  locale: string;
  canWrite: boolean;
}

const QUICK_LINKS = [
  { key: "leads", href: (s: string) => ROUTES.crmLeads(s), write: false },
  { key: "quotes", href: (s: string) => ROUTES.financeQuotes(s), write: false },
  { key: "contracts", href: (s: string) => ROUTES.financeContracts(s), write: false },
  { key: "clients", href: (s: string) => ROUTES.clients(s), write: false },
] as const;

export function CommercialHubView({
  slug,
  deals,
  kpis,
  byStage,
  activity,
  locale,
  canWrite,
}: CommercialHubViewProps) {
  const t = useTranslations("commercial.hub");
  const tWorkflow = useTranslations("commercial.workflow");
  const [stageFilter, setStageFilter] = useState<CommercialWorkflowStage | null>(null);

  const stageCounts = useMemo(
    () =>
      Object.fromEntries(
        COMMERCIAL_WORKFLOW_STAGES.map((s) => [s, byStage[s].length]),
      ) as Record<CommercialWorkflowStage, number>,
    [byStage],
  );

  const visibleDeals = stageFilter
    ? byStage[stageFilter]
    : deals.filter((d) => d.stage !== "client").slice(0, 12);

  return (
    <OperationsPage>
      <PageHeader
        title={t("title")}
        description={t("subtitle")}
        actions={
          canWrite ? (
            <Link
              href={ROUTES.crmLeads(slug)}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground"
            >
              <Plus className="size-3.5" />
              {t("newLead")}
            </Link>
          ) : undefined
        }
      />

      <div className="space-y-4">
        <CommercialKpiStrip kpis={kpis} locale={locale} />

        <CommercialWorkflowStrip
          counts={stageCounts}
          activeStage={stageFilter}
          onStageClick={(s) => setStageFilter((prev) => (prev === s ? null : s))}
        />

        <div className="grid gap-4 lg:grid-cols-3">
          <section className="overflow-hidden rounded-lg border border-border/60 bg-card lg:col-span-2">
            <header className="flex items-center justify-between border-b border-border/50 px-3 py-2">
              <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {stageFilter ? tWorkflow(`stages.${stageFilter}`) : t("activeDeals")}
              </h2>
              <Link
                href={ROUTES.commercialPipeline(slug)}
                className="flex items-center gap-0.5 text-[11px] font-medium text-muted-foreground hover:text-foreground"
              >
                {t("viewPipeline")}
                <ChevronRight className="size-3" />
              </Link>
            </header>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/40 text-left text-muted-foreground">
                    <th className="px-3 py-2 font-medium">{t("table.company")}</th>
                    <th className="px-3 py-2 font-medium">{t("table.stage")}</th>
                    <th className="px-3 py-2 font-medium">{t("table.value")}</th>
                    <th className="px-3 py-2 font-medium">{t("table.owner")}</th>
                    <th className="px-3 py-2 font-medium">{t("table.updated")}</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleDeals.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">
                        {t("emptyDeals")}
                      </td>
                    </tr>
                  ) : (
                    visibleDeals.map((deal) => (
                      <tr
                        key={deal.leadId}
                        className="border-b border-border/30 transition-colors hover:bg-muted/30"
                      >
                        <td className="px-3 py-2.5">
                          <Link
                            href={ROUTES.crmLead(slug, deal.leadId)}
                            className="font-medium hover:underline"
                          >
                            {deal.companyName}
                          </Link>
                          {deal.contactName && (
                            <p className="text-[10px] text-muted-foreground">{deal.contactName}</p>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="inline-flex items-center gap-1">
                            <span className={cn("size-1.5 rounded-full", STAGE_DOT[deal.stage])} />
                            {tWorkflow(`stages.${deal.stage}`)}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 tabular-nums">
                          {formatMoney(deal.valueCents, "EUR", locale)}
                        </td>
                        <td className="px-3 py-2.5 text-muted-foreground">
                          {deal.ownerName ?? "—"}
                        </td>
                        <td className="px-3 py-2.5 text-muted-foreground">
                          {formatDate(deal.updatedAt, locale)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <aside className="space-y-4">
            <section className="overflow-hidden rounded-lg border border-border/60 bg-card">
              <header className="border-b border-border/50 px-3 py-2">
                <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("modules")}
                </h2>
              </header>
              <nav className="divide-y divide-border/40">
                {QUICK_LINKS.map((link) => (
                  <Link
                    key={link.key}
                    href={link.href(slug)}
                    className="flex items-center justify-between px-3 py-2.5 text-xs font-medium transition-colors hover:bg-muted/40"
                  >
                    {t(`links.${link.key}`)}
                    <ChevronRight className="size-3 text-muted-foreground" />
                  </Link>
                ))}
              </nav>
            </section>

            <section className="overflow-hidden rounded-lg border border-border/60 bg-card">
              <header className="border-b border-border/50 px-3 py-2">
                <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("recentActivity")}
                </h2>
              </header>
              <ul className="max-h-72 divide-y divide-border/40 overflow-y-auto">
                {activity.length === 0 ? (
                  <li className="px-3 py-6 text-center text-xs text-muted-foreground">
                    {t("emptyActivity")}
                  </li>
                ) : (
                  activity.map((item) => (
                    <li key={item.id}>
                      <Link
                        href={item.entityHref}
                        className="block px-3 py-2.5 transition-colors hover:bg-muted/40"
                      >
                        <p className="text-xs font-medium">{item.entityLabel}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {t(`events.${item.eventType}`, { defaultValue: item.eventType })}
                          {item.actorName ? ` · ${item.actorName}` : ""}
                        </p>
                        <p className="text-[10px] text-muted-foreground/70">
                          {formatDate(item.createdAt, locale)}
                        </p>
                      </Link>
                    </li>
                  ))
                )}
              </ul>
            </section>
          </aside>
        </div>
      </div>
    </OperationsPage>
  );
}
