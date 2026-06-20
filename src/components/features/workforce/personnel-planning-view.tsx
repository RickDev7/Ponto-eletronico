"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { FileBarChart } from "lucide-react";
import { ROUTES } from "@/config/constants";
import {
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
import { OperationsPage, PageHeader } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { PlanningKpiStrip } from "@/components/features/workforce/planning-kpi-strip";
import { PlanningEmployeePanel } from "@/components/features/workforce/planning-employee-panel";
import { PlanningSidebar } from "@/components/features/workforce/planning-sidebar";
import { PlanningShiftSheet } from "@/components/features/workforce/planning-shift-sheet";
import { PlanningProfitabilityPanel } from "@/components/features/workforce/planning-profitability-panel";
import type { PlanningProfitability } from "@/lib/workforce/planning-profitability-types";

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
  canWrite: boolean;
  employees: WorkforceEmployeeRow[];
  vacations: VacationRequestRow[];
  absences: AbsenceRow[];
  shifts: ShiftRow[];
  summaries: TimeAccountSummary[];
  todayMinutes: number;
  unassignedTasks: number;
  profitability: PlanningProfitability | null;
}

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
  canWrite,
  employees,
  vacations,
  absences,
  shifts,
  summaries,
  todayMinutes,
  unassignedTasks,
  profitability,
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

  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [selectedShift, setSelectedShift] = useState<ShiftRow | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

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
        return computeEmployeeAvailability(
          emp,
          shifts,
          vacations,
          absences,
          rangeStart,
          rangeEnd,
          summary?.istMinutes ?? 0,
        );
      }),
    [employees, shifts, vacations, absences, rangeStart, rangeEnd, summaries],
  );

  const recommendations = useMemo(
    () => computeWorkloadRecommendations(shifts, employees, employeeCards),
    [shifts, employees, employeeCards],
  );

  const optimizeResult = useMemo(
    () => optimizeWeekPlan(shifts, employees, employeeCards),
    [shifts, employees, employeeCards],
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
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" asChild>
        <Link href={ROUTES.workforcePlanningReports(slug)}>
          <FileBarChart className="size-3.5" />
          {t("actions.reports")}
        </Link>
      </Button>
    </div>
  );

  return (
    <OperationsPage>
      <PageHeader title={t("title")} description={t("description")} actions={headerActions} />

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

      <div className="grid gap-4 lg:grid-cols-12">
        <div className="hidden lg:col-span-3 lg:block">
          <PlanningEmployeePanel
            slug={slug}
            cards={employeeCards}
            selectedId={selectedEmployeeId}
            onSelect={(id) => setSelectedEmployeeId((prev) => (prev === id ? null : id))}
          />
        </div>

        <div className="lg:col-span-6">
          <div className="rounded-xl border border-border/60 bg-card p-3 sm:p-4">
            <WorkforceShiftsView
              slug={slug}
              shifts={shifts}
              employees={employees.map((e) => ({ id: e.id, full_name: e.full_name }))}
              view={view}
              rangeLabel={rangeLabel}
              dates={dates}
              prevHref={prevHref}
              nextHref={nextHref}
              todayHref={todayHref}
              canWrite={canWrite}
              embedded
              detailed
              viewHref={({ view: v, week }) => ROUTES.workforcePlanning(slug, { view: v, week })}
              highlightEmployeeId={selectedEmployeeId}
              selectedAssignmentId={selectedShift?.assignmentId ?? null}
              onShiftSelect={handleShiftSelect}
            />
          </div>
        </div>

        <div className="lg:col-span-3">
          <PlanningSidebar
            slug={slug}
            weekStart={weekStart}
            monthStart={monthStart}
            recommendations={recommendations}
            optimizeResult={optimizeResult}
            canWrite={canWrite}
            selectedShiftId={selectedShift?.assignmentId ?? null}
            onSelectShift={() => undefined}
          />
        </div>
      </div>

      <PlanningShiftSheet
        slug={slug}
        shift={selectedShift}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        canWrite={canWrite}
      />
    </OperationsPage>
  );
}
