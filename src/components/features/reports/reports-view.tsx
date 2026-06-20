"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  FileText,
  Plus,
  Download,
  Calendar,
  Clock,
  Loader2,
  BarChart3,
  Sparkles,
  TrendingUp,
  Users,
  Building2,
  MapPin,
  Wrench,
  Bookmark,
} from "lucide-react";
import { getReportData, createReport, type ReportData } from "@/actions/reports/actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  OperationsPage,
  OperationsWorkspace,
  WorkspacePanelBar,
} from "@/components/shared/workspace";
import { PageHeader } from "@/components/shared/page-header";
import { KpiCard } from "@/components/shared/kpi-card";
import { EmptyState } from "@/components/shared/empty-state";
import type { ServiceType } from "@/types";
import { generatePdfReport } from "@/lib/reports/pdf-generator";
import { cn } from "@/lib/utils";

const SAVED_VIEWS = [
  { id: "7d", days: 7 },
  { id: "30d", days: 30 },
  { id: "mtd", days: null },
  { id: "prev", days: null },
] as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyReport = any;

interface ReportsViewProps {
  slug: string;
  reports: AnyReport[];
  companyName: string;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function firstDayOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

function lastDayOfMonth(year: number, month: number) {
  return new Date(year, month, 0).toISOString().slice(0, 10);
}

function addDays(iso: string, days: number) {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function daysBetween(start: string, end: string) {
  return Math.max(
    1,
    Math.floor(
      (new Date(`${end}T12:00:00`).getTime() - new Date(`${start}T12:00:00`).getTime()) /
        86_400_000,
    ) + 1,
  );
}

function previousPeriod(start: string, end: string) {
  const len = daysBetween(start, end);
  const prevEnd = addDays(start, -1);
  const prevStart = addDays(prevEnd, -(len - 1));
  return { start: prevStart, end: prevEnd };
}

function formatMinutes(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function checkInMinutes(
  checkIns: Array<{ check_in_at: string; check_out_at: string | null }>,
) {
  return checkIns.reduce((acc, ci) => {
    if (!ci.check_out_at) return acc;
    return (
      acc +
      Math.floor(
        (new Date(ci.check_out_at).getTime() - new Date(ci.check_in_at).getTime()) / 60_000,
      )
    );
  }, 0);
}

function aggregate(
  data: ReportData | null,
  locale: string,
  getServiceLabel: (key: string) => string,
  unknownLabel: string,
) {
  if (!data) {
    return {
      total: 0,
      completed: 0,
      completionRate: 0,
      checkins: 0,
      hours: 0,
      utilization: 0,
      byService: [] as Array<{
        key: string;
        label: string;
        tasks: number;
        completed: number;
        minutes: number;
      }>,
      byEmployee: [] as Array<{ name: string; tasks: number; minutes: number }>,
      byProperty: [] as Array<{ label: string; tasks: number }>,
      weekly: [] as Array<{ label: string; total: number; completed: number }>,
    };
  }

  const byServiceMap = new Map<string, { tasks: number; completed: number; minutes: number }>();
  const byEmployeeMap = new Map<string, { tasks: number; minutes: number }>();
  const byPropertyMap = new Map<string, number>();
  const weeklyMap = new Map<string, { total: number; completed: number }>();

  let totalMinutes = 0;
  let tasksWithCheckins = 0;
  let totalCheckins = 0;

  for (const task of data.tasks) {
    const st = task.service_type;
    const svc = byServiceMap.get(st) ?? { tasks: 0, completed: 0, minutes: 0 };
    svc.tasks += 1;
    if (task.status === "completed") svc.completed += 1;
    byServiceMap.set(st, svc);

    const weekKey = task.scheduled_date.slice(0, 10);
    const week = weeklyMap.get(weekKey) ?? { total: 0, completed: 0 };
    week.total += 1;
    if (task.status === "completed") week.completed += 1;
    weeklyMap.set(weekKey, week);

    const propLabel = task.address
      ? `${task.address.street}, ${task.address.city}`
      : unknownLabel;
    byPropertyMap.set(propLabel, (byPropertyMap.get(propLabel) ?? 0) + 1);

    const mins = checkInMinutes(task.check_ins);
    totalMinutes += mins;
    totalCheckins += task.check_ins.length;
    if (task.check_ins.length > 0) tasksWithCheckins += 1;

    const svcEntry = byServiceMap.get(st)!;
    svcEntry.minutes += mins;

    for (const ci of task.check_ins) {
      const name = ci.employee_name ?? "—";
      const emp = byEmployeeMap.get(name) ?? { tasks: 0, minutes: 0 };
      emp.tasks += 1;
      if (ci.check_out_at) {
        emp.minutes += Math.floor(
          (new Date(ci.check_out_at).getTime() - new Date(ci.check_in_at).getTime()) / 60_000,
        );
      }
      byEmployeeMap.set(name, emp);
    }
  }

  const total = data.summary.total;
  const completed = data.summary.completed;

  return {
    total,
    completed,
    completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    checkins: totalCheckins,
    hours: totalMinutes,
    utilization: total > 0 ? Math.round((tasksWithCheckins / total) * 100) : 0,
    byService: [...byServiceMap.entries()].map(([key, v]) => ({
      key,
      label: getServiceLabel(key),
      ...v,
    })),
    byEmployee: [...byEmployeeMap.values()].sort((a, b) => b.minutes - a.minutes),
    byProperty: [...byPropertyMap.entries()]
      .map(([label, tasks]) => ({ label, tasks }))
      .sort((a, b) => b.tasks - a.tasks),
    weekly: [...weeklyMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-8)
      .map(([date, v]) => ({
        label: new Date(`${date}T12:00:00`).toLocaleDateString(locale, {
          day: "2-digit",
          month: "2-digit",
        }),
        ...v,
      })),
  };
}

function pctChange(current: number, previous: number) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

export function ReportsView({ slug, reports, companyName }: ReportsViewProps) {
  const t = useTranslations("reports.intelligence");
  const tReports = useTranslations("reports");
  const tForms = useTranslations("forms");
  const tTasks = useTranslations("tasks");
  const tCommon = useTranslations("common");
  const tServiceTypes = useTranslations("serviceTypes");
  const locale = useLocale();

  const getServiceLabel = useCallback(
    (key: string) => tServiceTypes(key as ServiceType),
    [tServiceTypes],
  );

  const [open, setOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<string>("mtd");

  const [reportTitle, setReportTitle] = useState(() =>
    t("defaultTitle", { date: new Date().toLocaleDateString(locale) }),
  );
  const [periodStart, setPeriodStart] = useState(firstDayOfMonth());
  const [periodEnd, setPeriodEnd] = useState(todayIso());

  const [currentData, setCurrentData] = useState<ReportData | null>(null);
  const [previousData, setPreviousData] = useState<ReportData | null>(null);

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    const prev = previousPeriod(periodStart, periodEnd);
    const [cur, prv] = await Promise.all([
      getReportData(slug, periodStart, periodEnd),
      getReportData(slug, prev.start, prev.end),
    ]);
    if (cur.success) setCurrentData(cur.data);
    else setCurrentData(null);
    if (prv.success) setPreviousData(prv.data);
    else setPreviousData(null);
    setLoading(false);
  }, [slug, periodStart, periodEnd]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const cur = useMemo(
    () => aggregate(currentData, locale, getServiceLabel, tCommon("unknown")),
    [currentData, locale, getServiceLabel, tCommon],
  );
  const prv = useMemo(
    () => aggregate(previousData, locale, getServiceLabel, tCommon("unknown")),
    [previousData, locale, getServiceLabel, tCommon],
  );

  const insights = useMemo(() => {
    const items: string[] = [];
    const compDelta = pctChange(cur.completed, prv.completed);
    if (cur.completed > 0 || prv.completed > 0) {
      items.push(
        compDelta >= 0
          ? t("insightsCompletionUp", { percent: Math.abs(compDelta) })
          : t("insightsCompletionDown", { percent: Math.abs(compDelta) }),
      );
    }
    const rateDelta = cur.completionRate - prv.completionRate;
    if (rateDelta !== 0) {
      items.push(
        rateDelta > 0
          ? t("insightsRateUp", { points: rateDelta })
          : t("insightsRateDown", { points: Math.abs(rateDelta) }),
      );
    }
    const topService = [...cur.byService].sort((a, b) => b.completed - a.completed)[0];
    if (topService && topService.completed > 0) {
      items.push(
        t("insightsTopService", {
          service: topService.label,
          count: topService.completed,
        }),
      );
    }
    if (items.length === 0) {
      items.push(t("insightsEmpty"));
    }
    return items;
  }, [cur, prv, t]);

  const topEmployee = cur.byEmployee[0];
  const topProperty = cur.byProperty[0];
  const topService = [...cur.byService].sort((a, b) => b.completed - a.completed)[0];

  function applySavedView(viewId: string) {
    setActiveView(viewId);
    const now = new Date();
    if (viewId === "7d") {
      setPeriodStart(addDays(todayIso(), -6));
      setPeriodEnd(todayIso());
    } else if (viewId === "30d") {
      setPeriodStart(addDays(todayIso(), -29));
      setPeriodEnd(todayIso());
    } else if (viewId === "mtd") {
      setPeriodStart(firstDayOfMonth());
      setPeriodEnd(todayIso());
    } else if (viewId === "prev") {
      const y = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
      const m = now.getMonth() === 0 ? 12 : now.getMonth();
      setPeriodStart(new Date(y, m - 1, 1).toISOString().slice(0, 10));
      setPeriodEnd(lastDayOfMonth(y, m));
    }
  }

  async function handleGenerate() {
    if (!reportTitle.trim()) {
      toast.error(t("errors.titleRequired"));
      return;
    }
    if (periodStart > periodEnd) {
      toast.error(t("errors.invalidPeriod"));
      return;
    }

    setGenerating(true);
    const dataResult = await getReportData(slug, periodStart, periodEnd);
    if (!dataResult.success) {
      toast.error(dataResult.error);
      setGenerating(false);
      return;
    }

    await createReport(slug, {
      reportType: "custom",
      title: reportTitle,
      periodStart,
      periodEnd,
      metadata: { taskCount: dataResult.data.summary.total },
    });

    generatePdfReport(dataResult.data, reportTitle);
    setGenerating(false);
    setOpen(false);
    toast.success(t("reportCreated"));
  }

  async function handleRegenerate(report: AnyReport) {
    if (!report.period_start || !report.period_end) {
      toast.error(t("errors.noPeriod"));
      return;
    }
    setRegeneratingId(report.id);
    const dataResult = await getReportData(slug, report.period_start, report.period_end);
    setRegeneratingId(null);
    if (!dataResult.success) {
      toast.error(dataResult.error);
      return;
    }
    generatePdfReport(dataResult.data, report.title);
  }

  const maxWeekly = Math.max(...cur.weekly.map((w) => w.total), 1);
  const maxService = Math.max(...cur.byService.map((s) => s.tasks), 1);

  return (
    <OperationsPage className="pb-4">
      <PageHeader
        title={t("title")}
        description={t("description", { company: companyName })}
        compact
        actions={
          <div className="flex flex-wrap items-center gap-1.5">
            <Link
              href={`/${slug}/reports/monthly`}
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "h-7 gap-1 text-[11px]",
              )}
            >
              <BarChart3 className="size-3" />
              {t("monthlyReport")}
            </Link>
            <Button size="sm" className="h-7 text-[11px]" onClick={() => setOpen(true)}>
              <Plus className="size-3" />
              {t("pdfReport")}
            </Button>
          </div>
        }
      />

      {/* Top bar: date range + export + saved views */}
      <OperationsWorkspace>
        <div className="flex flex-col gap-2 border-b border-border/60 p-2.5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-1.5">
            <Bookmark className="size-3 text-muted-foreground" />
            {SAVED_VIEWS.map((view) => (
              <button
                key={view.id}
                type="button"
                suppressHydrationWarning
                onClick={() => applySavedView(view.id)}
                className={cn(
                  "rounded-md px-2 py-1 text-[11px] font-medium transition-colors",
                  activeView === view.id
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
                )}
              >
                {t(`savedViews.${view.id}`)}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <Input
              type="date"
              className="h-7 w-[130px] text-[11px]"
              value={periodStart}
              onChange={(e) => {
                setActiveView("custom");
                setPeriodStart(e.target.value);
              }}
            />
            <span className="text-[11px] text-muted-foreground">–</span>
            <Input
              type="date"
              className="h-7 w-[130px] text-[11px]"
              value={periodEnd}
              onChange={(e) => {
                setActiveView("custom");
                setPeriodEnd(e.target.value);
              }}
            />
            <a
              href={`/${slug}/reports/export?type=checkins&from=${periodStart}&to=${periodEnd}`}
              download
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "h-7 gap-1 text-[11px]",
              )}
            >
              <Download className="size-3" />
              {t("export")}
            </a>
          </div>
        </div>
      </OperationsWorkspace>

      {/* Executive KPI row */}
      <OperationsWorkspace className="mt-2">
        <div className="grid grid-cols-2 divide-x divide-border/60 border-b border-border/60 lg:grid-cols-6">
          <KpiCard
            variant="strip"
            label={t("kpis.orderVolume")}
            value={loading ? "—" : cur.total}
            hint={`${pctChange(cur.total, prv.total) >= 0 ? "+" : ""}${pctChange(cur.total, prv.total)}%`}
            icon={TrendingUp}
          />
          <KpiCard
            variant="strip"
            label={t("kpis.completed")}
            value={loading ? "—" : cur.completed}
            hint={`${pctChange(cur.completed, prv.completed) >= 0 ? "+" : ""}${pctChange(cur.completed, prv.completed)}%`}
            icon={BarChart3}
          />
          <KpiCard
            variant="strip"
            label={t("kpis.completionRate")}
            value={loading ? "—" : `${cur.completionRate}%`}
            hint={`${cur.completionRate - prv.completionRate >= 0 ? "+" : ""}${cur.completionRate - prv.completionRate} PP`}
            icon={TrendingUp}
            iconClassName={
              cur.completionRate >= 80
                ? "text-emerald-500/70"
                : "text-amber-500/70"
            }
          />
          <KpiCard
            variant="strip"
            label={t("kpis.teamUtilization")}
            value={loading ? "—" : `${cur.utilization}%`}
            hint={t("kpis.utilizationHint")}
            icon={Users}
          />
          <KpiCard
            variant="strip"
            label={t("kpis.fieldHours")}
            value={loading ? "—" : formatMinutes(cur.hours)}
            hint={t("kpis.checkIns", { count: cur.checkins })}
            icon={Clock}
          />
          <KpiCard
            variant="strip"
            label={t("kpis.serviceEfficiency")}
            value={loading ? "—" : topService ? `${topService.completed}` : "0"}
            hint={topService?.label ?? "—"}
            icon={Wrench}
          />
        </div>
      </OperationsWorkspace>

      {/* Insights */}
      <OperationsWorkspace className="mt-2">
        <WorkspacePanelBar icon={Sparkles}>{t("insights")}</WorkspacePanelBar>
        <div className="space-y-1.5 p-2.5">
          {insights.map((text, i) => (
            <p
              key={i}
              className="flex items-start gap-2 text-[12px] leading-relaxed text-muted-foreground"
            >
              <Sparkles className="mt-0.5 size-3 shrink-0 text-primary/60" />
              {text}
            </p>
          ))}
        </div>
      </OperationsWorkspace>

      {/* Charts */}
      <div className="mt-2 grid gap-2 lg:grid-cols-2">
        <OperationsWorkspace>
          <WorkspacePanelBar icon={BarChart3}>{t("taskTrend")}</WorkspacePanelBar>
          <div className="p-3">
            {cur.weekly.length === 0 ? (
              <p className="py-6 text-center text-[11px] text-muted-foreground">
                {t("noData")}
              </p>
            ) : (
              <div className="space-y-2">
                <div className="flex h-28 items-end gap-1">
                  {cur.weekly.map((w) => (
                    <div key={w.label} className="flex flex-1 flex-col items-center gap-1">
                      <div
                        className="flex w-full flex-col-reverse overflow-hidden rounded-sm bg-muted/30"
                        style={{
                          height: `${Math.max((w.total / maxWeekly) * 100, 8)}%`,
                          minHeight: "0.5rem",
                        }}
                      >
                        {w.completed > 0 && (
                          <div
                            className="w-full bg-emerald-500/80"
                            style={{ height: `${(w.completed / w.total) * 100}%` }}
                          />
                        )}
                        {w.total - w.completed > 0 && (
                          <div
                            className="w-full bg-primary/25"
                            style={{
                              height: `${((w.total - w.completed) / w.total) * 100}%`,
                            }}
                          />
                        )}
                      </div>
                      <span className="text-[9px] tabular-nums text-muted-foreground">
                        {w.label}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="flex gap-3 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <span className="size-2 rounded-sm bg-primary/25" />
                    {t("legendOpen")}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="size-2 rounded-sm bg-emerald-500/80" />
                    {t("legendCompleted")}
                  </span>
                </div>
              </div>
            )}
          </div>
        </OperationsWorkspace>

        <OperationsWorkspace>
          <WorkspacePanelBar icon={Wrench}>{t("serviceMix")}</WorkspacePanelBar>
          <div className="space-y-2 p-3">
            {cur.byService.length === 0 ? (
              <p className="py-6 text-center text-[11px] text-muted-foreground">
                {t("noData")}
              </p>
            ) : (
              cur.byService.map((svc) => {
                const rate =
                  svc.tasks > 0 ? Math.round((svc.completed / svc.tasks) * 100) : 0;
                return (
                  <div key={svc.key} className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="truncate font-medium">{svc.label}</span>
                      <span className="tabular-nums text-muted-foreground">
                        {svc.completed}/{svc.tasks}
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted/40">
                      <div
                        className="h-full rounded-full bg-primary/50 transition-all"
                        style={{ width: `${(svc.tasks / maxService) * 100}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {t("completionRate", { rate, duration: formatMinutes(svc.minutes) })}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </OperationsWorkspace>
      </div>

      {/* Top performers */}
      <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            icon: Users,
            title: t("topCards.topEmployee"),
            value: topEmployee?.name ?? "—",
            hint: topEmployee ? formatMinutes(topEmployee.minutes) : t("topCards.noData"),
          },
          {
            icon: Building2,
            title: t("topCards.topProperty"),
            value: topProperty?.label ?? "—",
            hint: topProperty ? t("topCards.tasks", { count: topProperty.tasks }) : t("topCards.noData"),
          },
          {
            icon: Wrench,
            title: t("topCards.topService"),
            value: topService?.label ?? "—",
            hint: topService ? t("topCards.completed", { count: topService.completed }) : t("topCards.noData"),
          },
          {
            icon: MapPin,
            title: t("topCards.checkInActivity"),
            value: loading ? "—" : String(cur.checkins),
            hint: t("topCards.periodTotal"),
          },
        ].map((card) => (
          <OperationsWorkspace key={card.title}>
            <div className="p-2.5">
              <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                <card.icon className="size-3" />
                {card.title}
              </div>
              <p className="mt-1.5 truncate text-[13px] font-semibold tracking-tight">
                {card.value}
              </p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">{card.hint}</p>
            </div>
          </OperationsWorkspace>
        ))}
      </div>

      {/* Operational metrics table */}
      <OperationsWorkspace className="mt-2 overflow-hidden">
        <WorkspacePanelBar icon={BarChart3}>{t("metricsTable")}</WorkspacePanelBar>
        <div className="overflow-x-auto">
          <table className="ui-density-table w-full text-left text-[11px]">
            <thead>
              <tr className="border-b border-border/60 text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="px-2.5 py-1.5 font-medium">{t("metricsColumns.service")}</th>
                <th className="px-2.5 py-1.5 font-medium text-right">{t("metricsColumns.tasks")}</th>
                <th className="px-2.5 py-1.5 font-medium text-right">{t("metricsColumns.completion")}</th>
                <th className="px-2.5 py-1.5 font-medium text-right">{t("metricsColumns.avgDuration")}</th>
              </tr>
            </thead>
            <tbody>
              {cur.byService.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-2.5 py-4 text-center text-muted-foreground">
                    {t("noData")}
                  </td>
                </tr>
              ) : (
                cur.byService.map((svc) => {
                  const rate =
                    svc.tasks > 0 ? Math.round((svc.completed / svc.tasks) * 100) : 0;
                  const avgMins =
                    svc.completed > 0 ? Math.round(svc.minutes / svc.completed) : 0;
                  return (
                    <tr
                      key={svc.key}
                      className="border-b border-border/40 transition-colors hover:bg-muted/20"
                    >
                      <td className="px-2.5 py-1.5 font-medium">{svc.label}</td>
                      <td className="px-2.5 py-1.5 text-right tabular-nums text-muted-foreground">
                        {svc.tasks}
                      </td>
                      <td className="px-2.5 py-1.5 text-right tabular-nums">
                        <span
                          className={cn(
                            rate >= 80
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-muted-foreground",
                          )}
                        >
                          {rate}%
                        </span>
                      </td>
                      <td className="px-2.5 py-1.5 text-right tabular-nums text-muted-foreground">
                        {avgMins > 0 ? formatMinutes(avgMins) : "—"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </OperationsWorkspace>

      {/* Export + report history */}
      <OperationsWorkspace className="mt-2">
        <WorkspacePanelBar icon={Download}>{t("exportSection")}</WorkspacePanelBar>
        <div className="flex flex-wrap gap-1.5 p-2.5 border-b border-border/60">
          <a
            href={`/${slug}/reports/export?type=checkins&from=${periodStart}&to=${periodEnd}`}
            download
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "h-7 gap-1 text-[11px]",
            )}
          >
            <Download className="size-3" />
            {t("hoursReport")}
          </a>
          <a
            href={`/${slug}/reports/export?type=tasks&from=${periodStart}&to=${periodEnd}`}
            download
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "h-7 gap-1 text-[11px]",
            )}
          >
            <Download className="size-3" />
            {t("taskList")}
          </a>
        </div>

        {reports.length === 0 ? (
          <EmptyState
            icon={FileText}
            title={tReports("empty.title")}
            description={tReports("empty.description")}
            size="sm"
          />
        ) : (
          <div className="divide-y divide-border/60">
            {reports.map((report: AnyReport) => {
              const generator = Array.isArray(report.generator)
                ? report.generator[0]
                : report.generator;
              const isLoading = regeneratingId === report.id;

              return (
                <div
                  key={report.id}
                  className="group flex items-center gap-3 px-2.5 py-2 transition-colors hover:bg-muted/20"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-medium">{report.title}</p>
                    <div className="mt-0.5 flex flex-wrap gap-2 text-[10px] text-muted-foreground">
                      {report.period_start && (
                        <span className="flex items-center gap-0.5">
                          <Calendar className="size-2.5" />
                          {new Date(report.period_start).toLocaleDateString(locale)}
                          {" – "}
                          {new Date(
                            report.period_end ?? report.period_start,
                          ).toLocaleDateString(locale)}
                        </span>
                      )}
                      <span>
                        {tReports(`types.${report.report_type}` as "daily")}
                      </span>
                      {generator?.full_name && <span>{generator.full_name}</span>}
                    </div>
                  </div>
                  <button
                    type="button"
                    suppressHydrationWarning
                    onClick={() => handleRegenerate(report)}
                    disabled={isLoading}
                    className={cn(
                      buttonVariants({ variant: "outline", size: "sm" }),
                      "h-7 gap-1 text-[11px]",
                    )}
                  >
                    {isLoading ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : (
                      <Download className="size-3" />
                    )}
                    PDF
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </OperationsWorkspace>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("newReport")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>{tTasks("form.title")}</Label>
              <Input
                value={reportTitle}
                onChange={(e) => setReportTitle(e.target.value)}
                placeholder={t("reportTitlePlaceholder")}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{tForms("labels.from")}</Label>
                <Input
                  type="date"
                  value={periodStart}
                  onChange={(e) => setPeriodStart(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{tForms("labels.to")}</Label>
                <Input
                  type="date"
                  value={periodEnd}
                  onChange={(e) => setPeriodEnd(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {tCommon("cancel")}
            </Button>
            <Button onClick={handleGenerate} disabled={generating}>
              {generating && <Loader2 className="animate-spin" />}
              {t("generate")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </OperationsPage>
  );
}
