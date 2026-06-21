"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Download, Clock, Coffee, Car, TrendingUp, CalendarDays } from "lucide-react";
import { ROUTES } from "@/config/constants";
import { formatMinutes } from "@/lib/workforce/workforce-data";
import type { TimeTrackingReport, TimeReportGranularity } from "@/lib/time-tracking/compute-time-summary";
import { buildPayrollCsv } from "@/lib/time-tracking/payroll-export";
import { EmptyState, OperationsPage, OperationsWorkspace, PageHeader } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface TimeTrackingViewProps {
  slug: string;
  locale: string;
  report: TimeTrackingReport;
  anchorDate: string;
  embedded?: boolean;
}

function downloadPayrollCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function TimeTrackingView({ slug, locale, report, anchorDate, embedded }: TimeTrackingViewProps) {
  const t = useTranslations("timeTracking");
  const router = useRouter();
  const [granularity, setGranularity] = useState<TimeReportGranularity>(report.granularity);

  const kpis = useMemo(
    () => [
      { label: t("kpis.planned"), value: formatMinutes(report.kpis.plannedMinutes), icon: CalendarDays },
      { label: t("kpis.worked"), value: formatMinutes(report.kpis.workedMinutes), icon: Clock },
      { label: t("kpis.breaks"), value: formatMinutes(report.kpis.breakMinutes), icon: Coffee },
      { label: t("kpis.travel"), value: formatMinutes(report.kpis.travelMinutes), icon: Car },
      { label: t("kpis.overtime"), value: formatMinutes(report.kpis.overtimeMinutes), icon: TrendingUp },
    ],
    [report.kpis, t],
  );

  function navigate(next: { g?: TimeReportGranularity; date?: string }) {
    const g = next.g ?? granularity;
    const date = next.date ?? anchorDate;
    router.push(
      `${ROUTES.workforceTimeBank(slug, { tab: "tracking", granularity: g, date })}`,
    );
  }

  function shiftAnchor(delta: number) {
    const d = new Date(anchorDate + "T12:00:00");
    if (granularity === "daily") d.setDate(d.getDate() + delta);
    else if (granularity === "weekly") d.setDate(d.getDate() + delta * 7);
    else d.setMonth(d.getMonth() + delta);
    navigate({ date: d.toISOString().slice(0, 10) });
  }

  function exportPayroll() {
    const csv = buildPayrollCsv(report.rows, locale);
    downloadPayrollCsv(`payroll-${report.granularity}-${report.from}-${report.to}.csv`, csv);
  }

  return (
    <OperationsPage className={embedded ? "gap-0" : undefined}>
      {!embedded && (
        <PageHeader
          title={t("title")}
          description={t("description", { from: report.from, to: report.to })}
          actions={
            <Button variant="outline" size="sm" className="gap-2" onClick={exportPayroll}>
              <Download className="size-4" />
              {t("exportPayroll")}
            </Button>
          }
        />
      )}
      {embedded && (
        <div className="flex justify-end pb-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={exportPayroll}>
            <Download className="size-4" />
            {t("exportPayroll")}
          </Button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 px-1 pb-3">
        {(["daily", "weekly", "monthly"] as const).map((g) => (
          <button
            key={g}
            type="button"
            onClick={() => {
              setGranularity(g);
              navigate({ g });
            }}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
              granularity === g
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:bg-muted",
            )}
          >
            {t(`granularity.${g}`)}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => shiftAnchor(-1)}>
            ←
          </Button>
          <span className="min-w-[8rem] text-center text-xs text-muted-foreground tabular-nums">
            {report.from === report.to ? report.from : `${report.from} – ${report.to}`}
          </span>
          <Button variant="ghost" size="sm" onClick={() => shiftAnchor(1)}>
            →
          </Button>
        </div>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {kpis.map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
              <Icon className="size-4 text-muted-foreground/60" />
            </div>
            <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight">{value}</p>
          </div>
        ))}
      </div>

      <OperationsWorkspace className="overflow-hidden">
        {report.rows.length === 0 ? (
          <EmptyState
            icon={Clock}
            title={t("empty.title")}
            description={t("empty.description")}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>{t("columns.employee")}</TableHead>
                <TableHead>{t("columns.period")}</TableHead>
                <TableHead className="text-right">{t("columns.planned")}</TableHead>
                <TableHead className="text-right">{t("columns.worked")}</TableHead>
                <TableHead className="text-right">{t("columns.breaks")}</TableHead>
                <TableHead className="text-right">{t("columns.travel")}</TableHead>
                <TableHead className="text-right">{t("columns.netWorked")}</TableHead>
                <TableHead className="text-right">{t("columns.overtime")}</TableHead>
                <TableHead className="text-right">{t("columns.payable")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.rows.map((row) => (
                <TableRow key={`${row.employeeId}-${row.periodStart}`}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{row.employeeName}</p>
                      {row.employeeNumber && (
                        <p className="text-[11px] text-muted-foreground">#{row.employeeNumber}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{row.periodLabel}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatMinutes(row.plannedMinutes)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatMinutes(row.workedMinutes)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatMinutes(row.breakMinutes)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatMinutes(row.travelMinutes)}</TableCell>
                  <TableCell className="text-right tabular-nums font-medium">{formatMinutes(row.netWorkedMinutes)}</TableCell>
                  <TableCell className="text-right tabular-nums text-warning">{formatMinutes(row.overtimeMinutes)}</TableCell>
                  <TableCell className="text-right tabular-nums font-semibold text-primary">{formatMinutes(row.payableMinutes)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </OperationsWorkspace>

      <p className="mt-3 px-1 text-[11px] text-muted-foreground">{t("payrollHint")}</p>
    </OperationsPage>
  );
}
