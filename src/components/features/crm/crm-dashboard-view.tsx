"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ArrowRight, Plus } from "lucide-react";
import { motion } from "framer-motion";
import { ROUTES } from "@/config/constants";
import { formatDate, formatMoney } from "@/lib/finance/utils";
import { computeCrmKpis, type CrmActivityEvent, type LeadListRow } from "@/lib/crm/leads-data";
import { CrmKpiStrip } from "@/components/features/crm/crm-kpi-strip";
import { CrmActivityTimeline } from "@/components/features/crm/crm-activity-timeline";
import { LeadStatusBadge } from "@/components/features/crm/lead-status-badge";
import type { LeadStatus } from "@/lib/validations/crm";
import {
  OperationsPage,
  OperationsWorkspace,
  PageHeader,
} from "@/components/shared";

interface CrmDashboardViewProps {
  slug: string;
  leads: LeadListRow[];
  activities: CrmActivityEvent[];
  locale: string;
  canWrite: boolean;
}

const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

export function CrmDashboardView({ slug, leads, activities, locale, canWrite }: CrmDashboardViewProps) {
  const t = useTranslations("crm");
  const kpis = useMemo(() => computeCrmKpis(leads), [leads]);

  const recent = useMemo(
    () => [...leads].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 8),
    [leads],
  );

  return (
    <OperationsPage>
      <PageHeader
        title={t("dashboard.title")}
        description={t("dashboard.description")}
        actions={
          <div className="flex gap-2">
            <Link
              href={ROUTES.crmPipeline(slug)}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium"
            >
              {t("pipeline.title")}
              <ArrowRight className="size-3.5" />
            </Link>
            {canWrite && (
              <Link
                href={ROUTES.crmLeads(slug)}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground"
              >
                <Plus className="size-3.5" />
                {t("leads.new")}
              </Link>
            )}
          </div>
        }
      />

      <motion.div initial="hidden" animate="show" variants={fadeUp}>
        <CrmKpiStrip
          kpis={kpis}
          locale={locale}
          labels={{
            active: t("dashboard.kpi.active"),
            proposals: t("dashboard.kpi.proposals"),
            conversion: t("dashboard.kpi.conversion"),
            potential: t("dashboard.kpi.potential"),
            closed: t("dashboard.kpi.closed"),
            wonMonth: t("dashboard.kpi.wonMonth"),
          }}
        />
      </motion.div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <OperationsWorkspace>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold">{t("dashboard.recentLeads")}</h3>
            <Link href={ROUTES.crmLeads(slug)} className="text-xs text-primary hover:underline">
              {t("dashboard.viewAll")}
            </Link>
          </div>
          <div className="divide-y divide-border/60 rounded-xl border border-border/60">
            {recent.map((lead) => (
              <Link
                key={lead.id}
                href={ROUTES.crmLead(slug, lead.id)}
                className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-muted/30"
              >
                <div>
                  <p className="text-sm font-medium">{lead.company_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {lead.contact_name ?? "—"} · {formatDate(lead.created_at.slice(0, 10), locale)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium tabular-nums">
                    {formatMoney(lead.estimated_value_cents, "EUR", locale)}
                  </span>
                  <LeadStatusBadge status={lead.status as LeadStatus} />
                </div>
              </Link>
            ))}
          </div>
        </OperationsWorkspace>

        <OperationsWorkspace>
          <h3 className="mb-4 text-sm font-semibold">{t("dashboard.activity")}</h3>
          <CrmActivityTimeline slug={slug} events={activities} locale={locale} />
        </OperationsWorkspace>
      </div>
    </OperationsPage>
  );
}
