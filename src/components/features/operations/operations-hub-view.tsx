"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ChevronRight, Plus } from "lucide-react";
import { ROUTES } from "@/config/constants";
import { resolveExecutionStatus } from "@/lib/operations/operations-data";
import {
  type OperationsWorkflowStage,
} from "@/lib/operations/operations-workflow";
import { resolveTraceability } from "@/lib/operations/operations-workflow";
import type { OperationsHubData, TraceableExecution } from "@/lib/operations/traceable-execution-types";
import { ExecutionStatusBadge } from "@/components/features/operations/execution-status-badge";
import { ExecutionHistoryPanel } from "@/components/features/operations/execution-history-panel";
import { OperationsHubKpiStrip } from "@/components/features/operations/operations-hub-kpi-strip";
import { OperationsWorkflowStrip } from "@/components/features/operations/operations-workflow-strip";
import { OperationsPage, PageHeader } from "@/components/shared";
import { cn } from "@/lib/utils";

interface OperationsHubViewProps {
  slug: string;
  data: OperationsHubData;
  locale: string;
  canWrite: boolean;
}

const QUICK_LINKS = [
  { key: "visits", href: (s: string) => ROUTES.operationsWorkOrders(s, { tab: "visits" }) },
  { key: "services", href: (s: string) => ROUTES.operationsServices(s) },
  { key: "scheduling", href: (s: string) => ROUTES.operationsScheduling(s) },
  { key: "equipment", href: (s: string) => ROUTES.operationsEquipment(s) },
  { key: "materials", href: (s: string) => ROUTES.operationsMaterials(s) },
  { key: "properties", href: (s: string) => ROUTES.operationsProperties(s) },
  { key: "jobs", href: (s: string) => ROUTES.operationsWorkOrders(s) },
  { key: "teams", href: (s: string) => ROUTES.workforceTeams(s) },
] as const;

function filterByStage(
  executions: TraceableExecution[],
  stage: OperationsWorkflowStage | null,
): TraceableExecution[] {
  if (!stage) return executions;
  switch (stage) {
    case "contract":
      return executions.filter((e) => e.contract_id);
    case "property":
      return executions.filter((e) => e.propertyId ?? e.address);
    case "service":
      return executions.filter((e) => e.service_id || e.serviceName || e.service_type);
    case "execution":
      return executions.filter(
        (e) => e.status === "completed" || e.status === "in_progress" || e.approved_at,
      );
    default:
      return executions;
  }
}

export function OperationsHubView({ slug, data, locale, canWrite }: OperationsHubViewProps) {
  const t = useTranslations("operations.hub");
  const tWorkflow = useTranslations("operations.workflow");
  const [stageFilter, setStageFilter] = useState<OperationsWorkflowStage | null>(null);

  const today = new Date().toISOString().slice(0, 10);
  const visibleExecutions = useMemo(() => {
    const filtered = filterByStage(data.executions, stageFilter);
    const upcoming = filtered
      .filter((e) => e.scheduled_date >= today && e.status !== "completed" && !e.approved_at)
      .slice(0, 12);
    if (stageFilter) return filtered.slice(0, 12);
    return upcoming.length > 0 ? upcoming : filtered.slice(0, 12);
  }, [data.executions, stageFilter, today]);

  const dateLocale = locale === "en" ? "en-US" : "pt-BR";

  return (
    <OperationsPage>
      <PageHeader
        title={t("title")}
        description={t("subtitle")}
        actions={
          canWrite ? (
            <Link
              href={ROUTES.operationsScheduling(slug)}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground"
            >
              <Plus className="size-3.5" />
              {t("scheduleVisit")}
            </Link>
          ) : undefined
        }
      />

      <div className="space-y-4">
        <OperationsHubKpiStrip
          kpis={data.kpis}
          activeContracts={data.activeContracts}
          activeProperties={data.activeProperties}
          activeServices={data.activeServices}
          labels={{
            today: t("kpis.today"),
            week: t("kpis.week"),
            completed: t("kpis.completed"),
            overdue: t("kpis.overdue"),
            traceable: t("kpis.traceable"),
            upcoming: t("kpis.upcoming"),
            contracts: t("kpis.contracts"),
            properties: t("kpis.properties"),
            services: t("kpis.services"),
          }}
        />

        <OperationsWorkflowStrip
          counts={data.workflowCounts}
          activeStage={stageFilter}
          onStageClick={(s) => setStageFilter((prev) => (prev === s ? null : s))}
        />

        <div className="grid gap-4 lg:grid-cols-3">
          <section className="overflow-hidden rounded-lg border border-border/60 bg-card lg:col-span-2">
            <header className="flex items-center justify-between border-b border-border/50 px-3 py-2">
              <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {stageFilter ? tWorkflow(`stages.${stageFilter}`) : t("upcomingVisits")}
              </h2>
              <Link
                href={ROUTES.operationsWorkOrders(slug, { tab: "visits" })}
                className="flex items-center gap-0.5 text-[11px] font-medium text-muted-foreground hover:text-foreground"
              >
                {t("viewAll")}
                <ChevronRight className="size-3" />
              </Link>
            </header>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/40 text-left text-muted-foreground">
                    <th className="px-3 py-2 font-medium">{t("table.visit")}</th>
                    <th className="px-3 py-2 font-medium">{t("table.property")}</th>
                    <th className="px-3 py-2 font-medium">{t("table.service")}</th>
                    <th className="px-3 py-2 font-medium">{t("table.date")}</th>
                    <th className="px-3 py-2 font-medium">{t("table.status")}</th>
                    <th className="px-3 py-2 font-medium">{t("table.trace")}</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleExecutions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">
                        {t("emptyVisits")}
                      </td>
                    </tr>
                  ) : (
                    visibleExecutions.map((visit) => {
                      const trace = resolveTraceability(visit);
                      return (
                        <tr
                          key={visit.id}
                          className="border-b border-border/30 transition-colors hover:bg-muted/30"
                        >
                          <td className="px-3 py-2.5">
                            <Link
                              href={ROUTES.task(slug, visit.id)}
                              className="font-medium hover:underline"
                            >
                              {visit.title}
                            </Link>
                            {visit.clientName && (
                              <p className="text-[10px] text-muted-foreground">{visit.clientName}</p>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-muted-foreground">
                            {visit.address
                              ? `${visit.address.street}, ${visit.address.city}`
                              : "—"}
                          </td>
                          <td className="px-3 py-2.5 text-muted-foreground">
                            {visit.serviceName ?? visit.service_type}
                          </td>
                          <td className="px-3 py-2.5 tabular-nums text-muted-foreground">
                            {new Date(visit.scheduled_date + "T12:00:00").toLocaleDateString(dateLocale)}
                          </td>
                          <td className="px-3 py-2.5">
                            <ExecutionStatusBadge status={resolveExecutionStatus(visit)} />
                          </td>
                          <td className="px-3 py-2.5">
                            <span
                              className={cn(
                                "inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium",
                                trace.isFullyTraceable
                                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                                  : "bg-amber-500/10 text-amber-700 dark:text-amber-400",
                              )}
                            >
                              {trace.isFullyTraceable ? t("traceable") : t("gap")}
                            </span>
                          </td>
                        </tr>
                      );
                    })
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

            <ExecutionHistoryPanel
              events={data.recentHistory}
              locale={locale}
              title={t("recentHistory")}
              emptyMessage={t("emptyHistory")}
              maxHeight="max-h-72"
            />
          </aside>
        </div>
      </div>
    </OperationsPage>
  );
}
