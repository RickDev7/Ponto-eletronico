"use client";

import { useMemo, useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { FileBarChart, Plus } from "lucide-react";
import { ROUTES } from "@/config/constants";
import {
  computeAutoPlanAssignments,
  computeEmployeeAvailability,
  computeMonthlySummary,
  computePlanningKpis,
  computeWorkloadRecommendations,
  formatMinutes,
  optimizeWeekPlan,
  shiftDurationMinutes,
} from "@/lib/workforce/planning-data";
import type {
  AbsenceRow,
  ShiftRow,
  TimeAccountSummary,
  VacationRequestRow,
  WorkforceEmployeeRow,
} from "@/lib/workforce/workforce-data";
import type { VehicleRow } from "@/lib/vehicles/vehicle-data";
import { OperationsPage, PageHeader } from "@/components/shared";
import { AiDomainWidget } from "@/components/features/ai/ai-domain-widget";
import { Button } from "@/components/ui/button";
import { PlanningKpiStrip } from "@/components/features/workforce/planning-kpi-strip";
import { PlanningEmployeePanel } from "@/components/features/workforce/planning-employee-panel";
import { PlanningGrid } from "@/components/features/workforce/planning-grid";
import { PlanningSidebar } from "@/components/features/workforce/planning-sidebar";
import { PlanningShiftSheet } from "@/components/features/workforce/planning-shift-sheet";
import { PlanningProfitabilityPanel } from "@/components/features/workforce/planning-profitability-panel";
import type { PlanningProfitability } from "@/lib/workforce/planning-profitability-types";
import { cn } from "@/lib/utils";

interface UnassignedTaskRow {
  id: string;
  title: string;
  scheduled_date: string;
  service_type?: string | null;
}

interface EmployeeSkillRowProp {
  employee_id: string;
  skill_id: string;
  level: number;
  skill?: { name?: string; service_type?: string | null } | Array<{ name?: string; service_type?: string | null }> | null;
}

interface PersonnelPlanningViewProps {
  slug: string;
  locale: string;
  view: "day" | "week" | "month";
  rangeLabel: string;
  dates: string[];
  weekStart: string;
  monthStart: string;
  prevHref: string;
  nextHref: string;
  todayHref: string;
  initialEmployeeId?: string | null;
  canWrite: boolean;
  employees: WorkforceEmployeeRow[];
  vacations: VacationRequestRow[];
  absences: AbsenceRow[];
  shifts: ShiftRow[];
  summaries: TimeAccountSummary[];
  todayMinutes: number;
  unassignedTasks: number;
  unassignedTaskList: UnassignedTaskRow[];
  employeeSkillRows: EmployeeSkillRowProp[];
  profitability: PlanningProfitability | null;
  vehicles: VehicleRow[];
}

type MobilePanel = "employees" | "grid" | "recommendations";

export function PersonnelPlanningView({
  slug,
  locale,
  view,
  rangeLabel,
  dates,
  weekStart,
  monthStart,
  prevHref,
  nextHref,
  todayHref,
  initialEmployeeId = null,
  canWrite,
  employees,
  vacations,
  absences,
  shifts,
  summaries,
  todayMinutes,
  unassignedTasks,
  unassignedTaskList,
  employeeSkillRows,
  profitability,
  vehicles,
}: PersonnelPlanningViewProps) {
  const t = useTranslations("workforce.planning");
  const today = new Date().toISOString().slice(0, 10);

  const effectiveWeekPlannedMinutes = useMemo(() => {
    const d = new Date(today + "T12:00:00");
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    const ws = d.toISOString().slice(0, 10);
    const we = new Date(d);
    we.setDate(we.getDate() + 6);
    const weStr = we.toISOString().slice(0, 10);
    return shifts
      .filter((s) => s.scheduledDate >= ws && s.scheduledDate <= weStr)
      .reduce((a, s) => a + shiftDurationMinutes(s), 0);
  }, [shifts, today]);

  const rangeStart = dates[0];
  const rangeEnd = dates[dates.length - 1];

  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(
    initialEmployeeId,
  );

  useEffect(() => {
    setSelectedEmployeeId(initialEmployeeId);
  }, [initialEmployeeId]);
  const [selectedShift, setSelectedShift] = useState<ShiftRow | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>("grid");

  const kpis = useMemo(
    () =>
      computePlanningKpis({
        today,
        shifts,
        employees,
        vacations,
        absences,
        unassignedTasks,
        todayActualMinutes: todayMinutes,
        weekPlannedMinutes: effectiveWeekPlannedMinutes,
      }),
    [today, shifts, employees, vacations, absences, unassignedTasks, todayMinutes, effectiveWeekPlannedMinutes],
  );

  const employeeCards = useMemo(
    () =>
      employees.map((emp) => {
        const summary = summaries.find((s) => s.employeeId === emp.id);
        const empSkills = employeeSkillRows.filter((r) => r.employee_id === emp.id);
        const skillNames = empSkills.map((s) => {
          const skill = Array.isArray(s.skill) ? s.skill[0] : s.skill;
          return skill?.name ?? "";
        }).filter(Boolean);
        const serviceTypes = empSkills.flatMap((s) => {
          const skill = Array.isArray(s.skill) ? s.skill[0] : s.skill;
          return skill?.service_type ? [skill.service_type] : [];
        });
        return computeEmployeeAvailability(
          emp,
          shifts,
          vacations,
          absences,
          rangeStart,
          rangeEnd,
          summary?.istMinutes ?? 0,
          skillNames,
          serviceTypes,
        );
      }),
    [employees, shifts, vacations, absences, rangeStart, rangeEnd, summaries, employeeSkillRows],
  );

  const recommendations = useMemo(
    () => computeWorkloadRecommendations(shifts, employees, employeeCards),
    [shifts, employees, employeeCards],
  );

  const optimizeResult = useMemo(
    () => optimizeWeekPlan(shifts, employees, employeeCards),
    [shifts, employees, employeeCards],
  );

  const autoPlanAssignments = useMemo(
    () =>
      computeAutoPlanAssignments(
        unassignedTaskList,
        employees,
        employeeCards,
        shifts,
        vacations,
        absences,
      ),
    [unassignedTaskList, employees, employeeCards, shifts, vacations, absences],
  );

  const monthlySummary = useMemo(
    () => (view === "month" ? computeMonthlySummary(shifts, summaries) : null),
    [view, shifts, summaries],
  );

  function handleShiftSelect(shift: ShiftRow) {
    setSelectedShift(shift);
    setSheetOpen(true);
  }

  const headerActions = (
    <div className="flex flex-wrap items-center gap-2">
      {canWrite ? (
        <Button size="sm" className="h-8 gap-1.5 text-xs" asChild>
          <Link
            href={ROUTES.tasks(slug, {
              create: true,
              employee: selectedEmployeeId ?? undefined,
            })}
          >
            <Plus className="size-3.5" />
            {t("actions.newTask")}
          </Link>
        </Button>
      ) : null}
      <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" asChild>
        <Link href={ROUTES.workforcePlanningReports(slug)}>
          <FileBarChart className="size-3.5" />
          {t("actions.reports")}
        </Link>
      </Button>
    </div>
  );

  const mobileTabs: { key: MobilePanel; label: string }[] = [
    { key: "employees", label: t("layout.employees") },
    { key: "grid", label: t("layout.grid") },
    { key: "recommendations", label: t("layout.recommendations") },
  ];

  return (
    <OperationsPage>
      <PageHeader title={t("title")} description={t("description")} actions={headerActions} />

      <AiDomainWidget slug={slug} domain="workforce" compact className="mb-4" />

      <PlanningKpiStrip kpis={kpis} locale={locale} />

      {monthlySummary && (
        <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: t("monthly.planned"), value: formatMinutes(monthlySummary.plannedMinutes) },
            { label: t("monthly.worked"), value: formatMinutes(monthlySummary.workedMinutes) },
            { label: t("monthly.employees"), value: String(monthlySummary.employeeCount) },
            { label: t("monthly.utilization"), value: `${monthlySummary.avgUtilizationPct}%` },
          ].map((item) => (
            <div key={item.label} className="rounded-xl border border-border/60 bg-card px-4 py-3">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{item.label}</p>
              <p className="mt-1 text-lg font-semibold tabular-nums">{item.value}</p>
            </div>
          ))}
        </div>
      )}

      {view === "month" && profitability && (
        <div className="mb-4">
          <PlanningProfitabilityPanel
            byEmployee={profitability.byEmployee}
            byClient={profitability.byClient}
            totalMarginCents={profitability.totalMarginCents}
          />
        </div>
      )}

      <div className="mb-3 flex gap-1 lg:hidden">
        {mobileTabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setMobilePanel(tab.key)}
            className={cn(
              "flex-1 rounded-lg border px-2 py-1.5 text-xs font-medium",
              mobilePanel === tab.key
                ? "border-primary bg-primary/10 text-primary"
                : "border-border/60 text-muted-foreground",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid min-h-[520px] gap-4 lg:grid-cols-12">
        <div
          className={cn(
            "lg:col-span-3 lg:block",
            mobilePanel !== "employees" && "hidden",
          )}
        >
          <PlanningEmployeePanel
            slug={slug}
            cards={employeeCards}
            selectedId={selectedEmployeeId}
            onSelect={(id) => setSelectedEmployeeId((prev) => (prev === id ? null : id))}
          />
        </div>

        <div
          className={cn(
            "lg:col-span-6",
            mobilePanel !== "grid" && "hidden lg:block",
          )}
        >
          <div className="h-full rounded-xl border border-border/60 bg-card p-3 sm:p-4">
            <PlanningGrid
              slug={slug}
              shifts={shifts}
              employees={employees.map((e) => ({ id: e.id, full_name: e.full_name }))}
              employeeCards={employeeCards}
              vacations={vacations}
              absences={absences}
              view={view}
              rangeLabel={rangeLabel}
              dates={dates}
              prevHref={prevHref}
              nextHref={nextHref}
              todayHref={todayHref}
              canWrite={canWrite}
              viewHref={({ view: v, week }) => ROUTES.workforcePlanning(slug, { view: v, week })}
              highlightEmployeeId={selectedEmployeeId}
              selectedAssignmentId={selectedShift?.assignmentId ?? null}
              onShiftSelect={handleShiftSelect}
            />
          </div>
        </div>

        <div
          className={cn(
            "lg:col-span-3",
            mobilePanel !== "recommendations" && "hidden lg:block",
          )}
        >
          <PlanningSidebar
            slug={slug}
            weekStart={weekStart}
            monthStart={monthStart}
            recommendations={recommendations}
            optimizeResult={optimizeResult}
            autoPlanAssignments={autoPlanAssignments}
            canWrite={canWrite}
          />
        </div>
      </div>

      <PlanningShiftSheet
        slug={slug}
        shift={selectedShift}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        canWrite={canWrite}
        vehicles={vehicles}
      />
    </OperationsPage>
  );
}
