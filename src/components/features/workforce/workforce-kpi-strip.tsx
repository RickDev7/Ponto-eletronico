"use client";

import { FinanceKpiCard } from "@/components/features/finance/dashboard/finance-kpi-card";
import { formatMinutes, type WorkforceKpis } from "@/lib/workforce/workforce-data";

interface WorkforceKpiStripProps {
  kpis: WorkforceKpis;
  labels: {
    active: string;
    vacation: string;
    hoursToday: string;
    overtime: string;
    absences: string;
    shifts: string;
  };
}

export function WorkforceKpiStrip({ kpis, labels }: WorkforceKpiStripProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      <FinanceKpiCard label={labels.active} value={String(kpis.activeEmployees)} accent="emerald" />
      <FinanceKpiCard label={labels.vacation} value={String(kpis.onVacation)} accent="blue" />
      <FinanceKpiCard label={labels.hoursToday} value={formatMinutes(kpis.hoursTodayMinutes)} accent="neutral" />
      <FinanceKpiCard label={labels.overtime} value={formatMinutes(kpis.overtimeMinutes)} accent="amber" />
      <FinanceKpiCard label={labels.absences} value={String(kpis.absencesThisWeek)} accent="amber" />
      <FinanceKpiCard label={labels.shifts} value={String(kpis.shiftsThisWeek)} accent="blue" />
    </div>
  );
}
