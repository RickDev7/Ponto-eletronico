"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ROUTES } from "@/config/constants";
import { formatMoney } from "@/lib/finance/utils";
import type { CommercialDealRow, CommercialWorkflowStage } from "@/lib/commercial/commercial-types";
import { COMMERCIAL_WORKFLOW_STAGES } from "@/lib/commercial/commercial-types";
import { STAGE_ACCENT } from "@/lib/commercial/workflow";
import { CommercialWorkflowStrip } from "@/components/features/commercial/commercial-workflow-strip";
import { OperationsPage, OperationsWorkspace, PageHeader } from "@/components/shared";
import { cn } from "@/lib/utils";

interface CommercialPipelineViewProps {
  slug: string;
  deals: CommercialDealRow[];
  byStage: Record<CommercialWorkflowStage, CommercialDealRow[]>;
  locale: string;
}

export function CommercialPipelineView({
  slug,
  deals,
  byStage,
  locale,
}: CommercialPipelineViewProps) {
  const t = useTranslations("commercial.pipeline");
  const tWorkflow = useTranslations("commercial.workflow");

  const stageCounts = useMemo(
    () =>
      Object.fromEntries(
        COMMERCIAL_WORKFLOW_STAGES.map((s) => [s, byStage[s].length]),
      ) as Record<CommercialWorkflowStage, number>,
    [byStage],
  );

  return (
    <OperationsPage>
      <PageHeader title={t("title")} description={t("subtitle")} />

      <OperationsWorkspace>
        <CommercialWorkflowStrip counts={stageCounts} />

        <div className="mt-4 grid gap-3 overflow-x-auto lg:grid-cols-6">
          {COMMERCIAL_WORKFLOW_STAGES.map((stage) => (
            <div
              key={stage}
              className={cn(
                "min-w-[200px] rounded-xl border border-border/60 border-t-[3px] bg-card",
                STAGE_ACCENT[stage],
              )}
            >
              <header className="flex items-center justify-between border-b border-border/40 px-3 py-2">
                <h3 className="text-[11px] font-semibold">{tWorkflow(`stages.${stage}`)}</h3>
                <span className="text-[10px] tabular-nums text-muted-foreground">
                  {byStage[stage].length}
                </span>
              </header>
              <ul className="max-h-[min(70vh,520px)] space-y-1 overflow-y-auto p-2">
                {byStage[stage].length === 0 ? (
                  <li className="px-2 py-6 text-center text-[10px] text-muted-foreground">
                    {t("emptyColumn")}
                  </li>
                ) : (
                  byStage[stage].map((deal) => (
                    <li key={deal.leadId}>
                      <Link
                        href={ROUTES.crmLead(slug, deal.leadId)}
                        className="block rounded-lg border border-transparent bg-muted/20 px-2.5 py-2 transition-colors hover:border-border/60 hover:bg-muted/50"
                      >
                        <p className="text-xs font-medium leading-tight">{deal.companyName}</p>
                        {deal.contactName && (
                          <p className="mt-0.5 text-[10px] text-muted-foreground">
                            {deal.contactName}
                          </p>
                        )}
                        <p className="mt-1.5 text-[10px] font-medium tabular-nums">
                          {formatMoney(deal.valueCents, "EUR", locale)}
                        </p>
                        {deal.quoteNumber && (
                          <p className="mt-0.5 text-[10px] text-muted-foreground">
                            {deal.quoteNumber}
                          </p>
                        )}
                      </Link>
                    </li>
                  ))
                )}
              </ul>
            </div>
          ))}
        </div>

        <p className="mt-4 text-[11px] text-muted-foreground">
          {t("dealCount", { count: deals.length })}
        </p>
      </OperationsWorkspace>
    </OperationsPage>
  );
}
