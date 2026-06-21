"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ArrowRight, Box, Boxes, Building2, CalendarDays, ClipboardList, MapPin, Route, Users, Wrench } from "lucide-react";
import { ROUTES } from "@/config/constants";
import {
  computeOperationsKpis,
  resolveExecutionStatus,
  type ExecutionRow,
  type PropertyRow,
  type TeamRow,
} from "@/lib/operations/operations-data";
import { OperationsKpiStrip } from "@/components/features/operations/operations-kpi-strip";
import { ExecutionStatusBadge } from "@/components/features/operations/execution-status-badge";
import {
  OperationsPage,
  OperationsWorkspace,
  PageHeader,
} from "@/components/shared";

interface OperationsDashboardViewProps {
  slug: string;
  executions: ExecutionRow[];
  properties: PropertyRow[];
  teams: TeamRow[];
}

const QUICK_LINKS = [
  { key: "properties", href: (s: string) => ROUTES.operationsProperties(s), icon: MapPin },
  { key: "services", href: (s: string) => ROUTES.operationsServices(s), icon: Wrench },
  { key: "scheduling", href: (s: string) => ROUTES.operationsScheduling(s), icon: CalendarDays },
  { key: "equipment", href: (s: string) => ROUTES.operationsEquipment(s), icon: Box },
  { key: "materials", href: (s: string) => ROUTES.operationsMaterials(s), icon: Boxes },
  { key: "jobs", href: (s: string) => ROUTES.operationsWorkOrders(s), icon: ClipboardList },
  { key: "teams", href: (s: string) => ROUTES.workforceTeams(s), icon: Users },
  { key: "routes", href: (s: string) => ROUTES.operationsRoutes(s), icon: Route },
  { key: "clients", href: (s: string) => ROUTES.clients(s), icon: Building2 },
] as const;

export function OperationsDashboardView({
  slug,
  executions,
  properties,
  teams,
}: OperationsDashboardViewProps) {
  const t = useTranslations("operations");
  const kpis = computeOperationsKpis(executions, properties, teams);
  const today = new Date().toISOString().slice(0, 10);
  const todayJobs = executions.filter((e) => e.scheduled_date === today).slice(0, 8);

  return (
    <OperationsPage>
      <PageHeader
        title={t("dashboard.title")}
        description={t("dashboard.description")}
      />

      <OperationsKpiStrip
        kpis={kpis}
        labels={{
          today: t("dashboard.kpi.today"),
          week: t("dashboard.kpi.week"),
          completed: t("dashboard.kpi.completed"),
          overdue: t("dashboard.kpi.overdue"),
          completionRate: t("dashboard.kpi.completionRate"),
          properties: t("dashboard.kpi.properties"),
          teams: t("dashboard.kpi.teams"),
        }}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <OperationsWorkspace className="lg:col-span-2">
          <div className="flex items-center justify-between border-b px-3 py-2">
            <h3 className="text-sm font-semibold">{t("dashboard.todayJobs")}</h3>
            <Link href={ROUTES.operationsWorkOrders(slug)} className="text-xs text-primary hover:underline">
              {t("dashboard.viewAll")}
              <ArrowRight className="ml-1 inline size-3" />
            </Link>
          </div>
          {todayJobs.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">{t("dashboard.noJobsToday")}</p>
          ) : (
            <ul className="divide-y">
              {todayJobs.map((job) => (
                <li key={job.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                  <div className="min-w-0">
                    <Link
                      href={ROUTES.task(slug, job.id)}
                      className="block truncate text-sm font-medium hover:text-primary"
                    >
                      {job.title}
                    </Link>
                    <p className="truncate text-xs text-muted-foreground">
                      {job.address?.street ?? "—"} · {job.address?.city ?? "—"}
                    </p>
                  </div>
                  <ExecutionStatusBadge status={resolveExecutionStatus(job)} />
                </li>
              ))}
            </ul>
          )}
        </OperationsWorkspace>

        <OperationsWorkspace>
          <div className="border-b px-3 py-2">
            <h3 className="text-sm font-semibold">{t("dashboard.quickLinks")}</h3>
          </div>
          <ul className="divide-y">
            {QUICK_LINKS.map(({ key, href, icon: Icon }) => (
              <li key={key}>
                <Link
                  href={href(slug)}
                  className="flex items-center gap-2.5 px-3 py-2.5 text-sm transition-colors hover:bg-muted/50"
                >
                  <Icon className="size-4 text-muted-foreground" />
                  {t(`nav.${key}`)}
                  <ArrowRight className="ml-auto size-3.5 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        </OperationsWorkspace>
      </div>
    </OperationsPage>
  );
}
