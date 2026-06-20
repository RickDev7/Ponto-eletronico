"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Download, ChevronLeft, FileDown } from "lucide-react";
import { ROUTES } from "@/config/constants";
import { formatMinutes, computeMonthlySummary } from "@/lib/workforce/planning-data";
import type { ShiftRow, TimeAccountSummary } from "@/lib/workforce/workforce-data";
import type { PlanningProfitability } from "@/lib/workforce/planning-profitability-types";
import { openPlanningPdf } from "@/lib/workforce/planning-pdf";
import { OperationsPage, OperationsWorkspace, PageHeader } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { PlanningProfitabilityPanel } from "@/components/features/workforce/planning-profitability-panel";

interface PlanningReportsViewProps {
  slug: string;
  companyName: string;
  from: string;
  to: string;
  shifts: ShiftRow[];
  summaries: TimeAccountSummary[];
  profitability: PlanningProfitability;
}

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function PlanningReportsView({
  slug,
  companyName,
  from,
  to,
  shifts,
  summaries,
  profitability,
}: PlanningReportsViewProps) {
  const t = useTranslations("workforce.planning.reports");
  const monthly = computeMonthlySummary(shifts, summaries);

  const utilizationRows = summaries.map((s) => {
    const cap = s.weeklyHours * 60 * 4.33;
    const pct = cap > 0 ? Math.round((s.istMinutes / cap) * 100) : 0;
    return [s.employeeName, String(s.weeklyHours), formatMinutes(s.sollMinutes), formatMinutes(s.istMinutes), `${pct}%`];
  });

  function exportUtilization() {
    downloadCsv(`utilization-${from}-${to}.csv`, [
      [t("export.employee"), t("export.weeklyHours"), t("export.planned"), t("export.worked"), t("export.utilization")],
      ...utilizationRows,
    ]);
  }

  function exportShifts() {
    downloadCsv(`shifts-${from}-${to}.csv`, [
      [t("export.date"), t("export.employee"), t("export.task"), t("export.client"), t("export.location")],
      ...shifts.map((s) => [s.scheduledDate, s.employeeName, s.title, s.clientName, s.addressLabel]),
    ]);
  }

  function exportPdf() {
    openPlanningPdf({
      title: t("title"),
      companyName,
      period: { from, to },
      summaries,
      shifts,
      profitability: {
        byEmployee: profitability.byEmployee,
        byClient: profitability.byClient,
      },
      labels: {
        employee: t("export.employee"),
        planned: t("export.planned"),
        worked: t("export.worked"),
        utilization: t("export.utilization"),
        date: t("export.date"),
        task: t("export.task"),
        client: t("export.client"),
        location: t("export.location"),
        revenue: t("export.revenue"),
        labor: t("export.labor"),
        margin: t("export.margin"),
        shifts: t("export.shiftsLabel"),
      },
    });
  }

  return (
    <OperationsPage>
      <PageHeader
        title={t("title")}
        description={t("description", { from, to })}
        actions={
          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" asChild>
            <Link href={ROUTES.workforcePlanning(slug)}>
              <ChevronLeft className="size-3.5" />
              {t("back")}
            </Link>
          </Button>
        }
      />
      <OperationsWorkspace>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: t("planned"), value: formatMinutes(monthly.plannedMinutes) },
            { label: t("worked"), value: formatMinutes(monthly.workedMinutes) },
            { label: t("employees"), value: String(monthly.employeeCount) },
            { label: t("utilization"), value: `${monthly.avgUtilizationPct}%` },
          ].map((item) => (
            <div key={item.label} className="rounded-xl border border-border/60 bg-card px-4 py-3">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{item.label}</p>
              <p className="mt-1 text-lg font-semibold tabular-nums">{item.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <Button size="sm" variant="outline" className="gap-1.5" onClick={exportPdf}>
            <FileDown className="size-3.5" />
            {t("export.pdf")}
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={exportUtilization}>
            <Download className="size-3.5" />
            {t("export.utilizationCsv")}
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={exportShifts}>
            <Download className="size-3.5" />
            {t("export.shiftsCsv")}
          </Button>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <PlanningProfitabilityPanel
            byEmployee={profitability.byEmployee}
            byClient={profitability.byClient}
            totalMarginCents={profitability.totalMarginCents}
          />

          <div className="overflow-x-auto rounded-xl border border-border/60">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-2">{t("export.employee")}</th>
                  <th className="px-4 py-2">{t("export.planned")}</th>
                  <th className="px-4 py-2">{t("export.worked")}</th>
                  <th className="px-4 py-2">{t("export.utilization")}</th>
                </tr>
              </thead>
              <tbody>
                {summaries.map((s) => {
                  const cap = s.weeklyHours * 60 * 4.33;
                  const pct = cap > 0 ? Math.round((s.istMinutes / cap) * 100) : 0;
                  return (
                    <tr key={s.employeeId} className="border-b last:border-0">
                      <td className="px-4 py-2 font-medium">{s.employeeName}</td>
                      <td className="px-4 py-2 tabular-nums">{formatMinutes(s.sollMinutes)}</td>
                      <td className="px-4 py-2 tabular-nums">{formatMinutes(s.istMinutes)}</td>
                      <td className="px-4 py-2 tabular-nums">{pct}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </OperationsWorkspace>
    </OperationsPage>
  );
}
