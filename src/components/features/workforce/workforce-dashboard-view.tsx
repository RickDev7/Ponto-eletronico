"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ArrowRight } from "lucide-react";
import { ROUTES } from "@/config/constants";
import { computeWorkforceKpis } from "@/lib/workforce/workforce-data";
import { WorkforceKpiStrip } from "@/components/features/workforce/workforce-kpi-strip";
import { OperationsPage, OperationsWorkspace, PageHeader } from "@/components/shared";

interface WorkforceDashboardViewProps {
  slug: string;
  employees: Array<{ id: string; full_name: string; status: string; job_title?: string | null }>;
  vacations: Array<{ status: string; start_date: string; end_date: string }>;
  absences: Array<{ start_date: string; end_date: string }>;
  todayMinutes: number;
  overtimeMinutes: number;
  weekShifts: number;
}

const LINKS = [
  { key: "planning", href: (s: string) => ROUTES.workforcePlanning(s) },
  { key: "vehicles", href: (s: string) => ROUTES.workforceVehicles(s) },
  { key: "employees", href: (s: string) => ROUTES.workforceEmployees(s) },
  { key: "teams", href: (s: string) => ROUTES.workforceTeams(s) },
  { key: "skills", href: (s: string) => ROUTES.workforceSkills(s) },
  { key: "availability", href: (s: string) => ROUTES.workforceAvailability(s) },
  { key: "shifts", href: (s: string) => ROUTES.workforceShifts(s) },
  { key: "vacations", href: (s: string) => ROUTES.workforceVacations(s) },
  { key: "documents", href: (s: string) => ROUTES.workforceDocuments(s) },
  { key: "timeAccount", href: (s: string) => ROUTES.workforceTimeAccount(s) },
] as const;

export function WorkforceDashboardView({
  slug,
  employees,
  vacations,
  absences,
  todayMinutes,
  overtimeMinutes,
  weekShifts,
}: WorkforceDashboardViewProps) {
  const t = useTranslations("workforce");
  const kpis = useMemo(
    () =>
      computeWorkforceKpis(
        employees as Parameters<typeof computeWorkforceKpis>[0],
        vacations as Parameters<typeof computeWorkforceKpis>[1],
        absences as Parameters<typeof computeWorkforceKpis>[2],
        todayMinutes,
        overtimeMinutes,
        weekShifts,
      ),
    [employees, vacations, absences, todayMinutes, overtimeMinutes, weekShifts],
  );

  return (
    <OperationsPage>
      <PageHeader title={t("dashboard.title")} description={t("dashboard.description")} />
      <WorkforceKpiStrip
        kpis={kpis}
        labels={{
          active: t("dashboard.kpi.active"),
          vacation: t("dashboard.kpi.vacation"),
          hoursToday: t("dashboard.kpi.hoursToday"),
          overtime: t("dashboard.kpi.overtime"),
          absences: t("dashboard.kpi.absences"),
          shifts: t("dashboard.kpi.shifts"),
        }}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <OperationsWorkspace>
          <div className="border-b px-3 py-2 text-sm font-semibold">{t("dashboard.teamOverview")}</div>
          <ul className="divide-y">
            {employees.slice(0, 8).map((e) => (
              <li key={e.id} className="flex items-center justify-between px-3 py-2">
                <Link href={ROUTES.workforceEmployee(slug, e.id)} className="text-sm hover:text-primary">
                  {e.full_name}
                </Link>
                <span className="text-xs text-muted-foreground">{e.job_title ?? t("dashboard.noRole")}</span>
              </li>
            ))}
          </ul>
        </OperationsWorkspace>
        <OperationsWorkspace>
          <div className="border-b px-3 py-2 text-sm font-semibold">{t("dashboard.quickLinks")}</div>
          <ul className="divide-y">
            {LINKS.map(({ key, href }) => (
              <li key={key}>
                <Link href={href(slug)} className="flex items-center justify-between px-3 py-2 text-sm hover:bg-muted/50">
                  {t(`nav.${key}`)}
                  <ArrowRight className="size-3.5 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        </OperationsWorkspace>
      </div>
    </OperationsPage>
  );
}
