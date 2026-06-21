"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ChevronRight } from "lucide-react";
import { ROUTES } from "@/config/constants";
import type { ExecutiveDashboardData } from "@/lib/dashboard/load-executive-dashboard-data";
import { formatMoney } from "@/lib/finance/utils";
import { FinanceKpiCard } from "@/components/features/finance/dashboard/finance-kpi-card";
import { cn } from "@/lib/utils";

interface CommandCenterViewProps {
  slug: string;
  data: ExecutiveDashboardData;
  locale: string;
}

function Section({
  title,
  href,
  linkLabel,
  children,
  className,
}: {
  title: string;
  href?: string;
  linkLabel?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("overflow-hidden rounded-lg border border-border/60 bg-card", className)}>
      <header className="flex items-center justify-between border-b border-border/50 px-3 py-2">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </h2>
        {href && linkLabel && (
          <Link
            href={href}
            className="flex items-center gap-0.5 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            {linkLabel}
            <ChevronRight className="size-3" />
          </Link>
        )}
      </header>
      <div className="p-0">{children}</div>
    </section>
  );
}

const STATUS_DOT: Record<string, string> = {
  completed: "bg-emerald-500",
  in_progress: "bg-blue-500",
  scheduled: "bg-muted-foreground/50",
  draft: "bg-muted-foreground/30",
  cancelled: "bg-rose-500/50",
};

const ALERT_STYLE = {
  danger: "border-l-rose-500 bg-rose-500/[0.04]",
  warning: "border-l-amber-500 bg-amber-500/[0.04]",
  info: "border-l-blue-500 bg-blue-500/[0.04]",
} as const;

export function CommandCenterView({ slug, data, locale }: CommandCenterViewProps) {
  const t = useTranslations("dashboard.commandCenter");
  const tExec = useTranslations("dashboard.executive");
  const tStatus = useTranslations("status");

  const todayLabel = new Date().toLocaleDateString(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const kpiConfig = [
    { id: "todayServices", accent: "blue" as const },
    { id: "completedToday", accent: "emerald" as const },
    { id: "activeEmployees", accent: "neutral" as const },
    { id: "hoursWorked", accent: "amber" as const },
    ...(data.showFinance
      ? [
          { id: "monthlyRevenue", accent: "emerald" as const },
          { id: "openInvoices", accent: "rose" as const },
        ]
      : []),
  ];

  const kpiLabels: Record<string, string> = {
    todayServices: tExec("kpis.todayServices"),
    completedToday: tExec("kpis.completedToday"),
    activeEmployees: tExec("kpis.activeEmployees"),
    hoursWorked: tExec("kpis.hoursWorked"),
    monthlyRevenue: tExec("kpis.monthlyRevenue"),
    openInvoices: tExec("kpis.openInvoices"),
  };

  const workforceTotal =
    data.workforce.onService +
    data.workforce.available +
    data.workforce.absent +
    data.workforce.vacation;

  const weekMax = Math.max(
    1,
    ...data.weekPlanning.map(
      (d) => d.scheduled + d.inProgress + d.completed + d.overdue,
    ),
  );

  return (
    <div className="mx-auto max-w-[1400px] space-y-3 p-4 lg:p-5">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-2 pb-1">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {t("eyebrow")}
          </p>
          <h1 className="text-lg font-semibold tracking-tight">{t("title")}</h1>
        </div>
        <time className="text-xs text-muted-foreground tabular-nums">{todayLabel}</time>
      </div>

      {/* KPI Bar */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {kpiConfig.map(({ id, accent }) => {
          const kpi = data.kpis.find((k) => k.id === id);
          if (!kpi) return null;
          return (
            <FinanceKpiCard
              key={id}
              label={kpiLabels[id] ?? id}
              value={kpi.value}
              trend={
                kpi.trend
                  ? { value: kpi.trend, positive: kpi.trendPositive ?? true }
                  : undefined
              }
              accent={accent}
              alert={id === "openInvoices" && kpi.value !== "—" && kpi.value !== "€0"}
            />
          );
        })}
      </div>

      {/* Main grid */}
      <div className="grid gap-3 lg:grid-cols-12">
        {/* Today's Operations */}
        <div className="lg:col-span-7">
          <Section
            title={t("sections.todayOps")}
            href={ROUTES.tasks(slug)}
            linkLabel={t("viewAll")}
          >
            {data.todayServices.length === 0 ? (
              <p className="px-3 py-6 text-xs text-muted-foreground">
                {tExec("empty.todayServices")}
              </p>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/40 text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                    <th className="px-3 py-2 font-medium w-14">{t("cols.time")}</th>
                    <th className="px-3 py-2 font-medium">{t("cols.service")}</th>
                    <th className="hidden px-3 py-2 font-medium sm:table-cell">{t("cols.client")}</th>
                    <th className="hidden px-3 py-2 font-medium md:table-cell">{t("cols.assignee")}</th>
                    <th className="px-3 py-2 font-medium text-right">{t("cols.status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.todayServices.map((svc) => (
                    <tr
                      key={svc.id}
                      className="group border-b border-border/30 last:border-0 transition-colors hover:bg-muted/30"
                    >
                      <td className="px-3 py-2 tabular-nums text-muted-foreground">{svc.time}</td>
                      <td className="px-3 py-2">
                        <Link
                          href={ROUTES.task(slug, svc.id)}
                          className="font-medium text-foreground hover:text-primary"
                        >
                          {svc.title}
                        </Link>
                      </td>
                      <td className="hidden px-3 py-2 text-muted-foreground sm:table-cell">
                        {svc.clientName}
                      </td>
                      <td className="hidden px-3 py-2 text-muted-foreground md:table-cell">
                        {svc.employeeName}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <span className="inline-flex items-center gap-1.5">
                          <span
                            className={cn(
                              "size-1.5 rounded-full",
                              STATUS_DOT[svc.status] ?? "bg-muted-foreground/40",
                            )}
                          />
                          <span className="text-muted-foreground">
                            {tStatus(svc.status as "scheduled")}
                          </span>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Section>
        </div>

        {/* Open Issues */}
        <div className="lg:col-span-5">
          <Section title={t("sections.openIssues")}>
            {data.alerts.length === 0 ? (
              <p className="px-3 py-6 text-xs text-muted-foreground">{tExec("empty.noAlerts")}</p>
            ) : (
              <ul>
                {data.alerts.map((alert) => (
                  <li key={alert.id} className="border-b border-border/30 last:border-0">
                    <Link
                      href={alert.href}
                      className={cn(
                        "flex items-center gap-3 border-l-2 px-3 py-2.5 text-xs transition-colors hover:bg-muted/30",
                        ALERT_STYLE[alert.type],
                      )}
                    >
                      <span className="min-w-0 flex-1 font-medium">
                        {tExec(`alerts.${alert.messageKey}`, { count: alert.count })}
                      </span>
                      <span className="shrink-0 rounded-md bg-background/80 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums">
                        {alert.count}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>

        {/* Workforce Status */}
        <div className="lg:col-span-4">
          <Section
            title={t("sections.workforce")}
            href={ROUTES.workforcePlanning(slug)}
            linkLabel={t("planning")}
          >
            <div className="grid grid-cols-2 gap-px bg-border/40">
              {(
                [
                  ["onService", data.workforce.onService, "text-blue-600 dark:text-blue-400"],
                  ["available", data.workforce.available, "text-emerald-600 dark:text-emerald-400"],
                  ["absent", data.workforce.absent, "text-amber-600 dark:text-amber-400"],
                  ["vacation", data.workforce.vacation, "text-muted-foreground"],
                ] as const
              ).map(([key, value, color]) => (
                <div key={key} className="bg-card px-3 py-3">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    {tExec(`workforce.${key}`)}
                  </p>
                  <p className={cn("mt-0.5 text-xl font-semibold tabular-nums", color)}>{value}</p>
                  {workforceTotal > 0 && (
                    <div className="mt-2 h-0.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-current opacity-60"
                        style={{ width: `${Math.round((value / workforceTotal) * 100)}%` }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Section>
        </div>

        {/* Financial Snapshot */}
        <div className="lg:col-span-4">
          <Section
            title={t("sections.finance")}
            href={ROUTES.finance(slug)}
            linkLabel={t("viewAll")}
          >
            {data.finance ? (
              <dl className="divide-y divide-border/40">
                {(
                  [
                    ["monthlyRevenue", data.finance.monthlyRevenueCents, false],
                    ["projected", data.finance.projectedRevenueCents, false],
                    ["openInvoices", data.finance.openInvoicesCents, false],
                    ["overdueInvoices", data.finance.overdueInvoicesCents, true],
                  ] as const
                ).map(([key, cents, danger]) => (
                  <div key={key} className="flex items-center justify-between px-3 py-2">
                    <dt className="text-xs text-muted-foreground">
                      {tExec(`finance.${key}`)}
                    </dt>
                    <dd
                      className={cn(
                        "text-sm font-semibold tabular-nums",
                        danger && cents > 0 && "text-rose-600 dark:text-rose-400",
                      )}
                    >
                      {formatMoney(cents, "EUR", locale)}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="px-3 py-6 text-xs text-muted-foreground">
                {tExec("empty.financeRestricted")}
              </p>
            )}
          </Section>
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-4">
          <Section
            title={t("sections.activity")}
            href={ROUTES.analyticsOperational(slug, { tab: "activity" })}
            linkLabel={t("viewAll")}
          >
            {data.activities.length === 0 ? (
              <p className="px-3 py-6 text-xs text-muted-foreground">{tExec("empty.noActivity")}</p>
            ) : (
              <ul className="max-h-[200px] overflow-y-auto">
                {data.activities.slice(0, 8).map((act) => (
                  <li key={act.id} className="border-b border-border/30 last:border-0">
                    <Link
                      href={act.href}
                      className="flex items-start gap-2 px-3 py-2 transition-colors hover:bg-muted/30"
                    >
                      <span className="mt-1.5 size-1 shrink-0 rounded-full bg-primary/70" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium">{act.title}</p>
                        <p className="truncate text-[10px] text-muted-foreground">
                          {tExec(`activityTypes.${act.type}`)} · {act.subtitle}
                        </p>
                      </div>
                      <time className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
                        {new Date(act.at).toLocaleTimeString(locale, {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </time>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>
      </div>

      {/* Weekly Planning Preview */}
      <Section
        title={t("sections.weekPlanning")}
        href={ROUTES.workforcePlanning(slug)}
        linkLabel={t("planning")}
      >
        <div className="flex gap-1 px-3 py-3">
          {data.weekPlanning.map((day) => {
            const total = day.scheduled + day.inProgress + day.completed + day.overdue;
            const isToday = day.date === new Date().toISOString().slice(0, 10);
            return (
              <div
                key={day.date}
                className={cn(
                  "flex min-w-0 flex-1 flex-col rounded-md px-1.5 py-1.5",
                  isToday && "bg-primary/5 ring-1 ring-primary/20",
                )}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="truncate text-[10px] font-medium uppercase text-muted-foreground">
                    {day.label}
                  </span>
                  <span className="text-[10px] font-semibold tabular-nums">{total}</span>
                </div>
                <div className="mt-2 flex h-12 flex-col-reverse gap-px overflow-hidden rounded-sm bg-muted/50">
                  {day.completed > 0 && (
                    <div
                      className="bg-emerald-500/70"
                      style={{ height: `${(day.completed / weekMax) * 100}%`, minHeight: 2 }}
                    />
                  )}
                  {day.inProgress > 0 && (
                    <div
                      className="bg-blue-500/70"
                      style={{ height: `${(day.inProgress / weekMax) * 100}%`, minHeight: 2 }}
                    />
                  )}
                  {day.scheduled > 0 && (
                    <div
                      className="bg-muted-foreground/30"
                      style={{ height: `${(day.scheduled / weekMax) * 100}%`, minHeight: 2 }}
                    />
                  )}
                  {day.overdue > 0 && (
                    <div
                      className="bg-rose-500/80"
                      style={{ height: `${(day.overdue / weekMax) * 100}%`, minHeight: 2 }}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-3 border-t border-border/40 px-3 py-2 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-sm bg-muted-foreground/30" />
            {tExec("chart.scheduled")}
          </span>
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-sm bg-blue-500/70" />
            {tExec("chart.inProgress")}
          </span>
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-sm bg-emerald-500/70" />
            {tExec("chart.completed")}
          </span>
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-sm bg-rose-500/80" />
            {tExec("chart.overdue")}
          </span>
        </div>
      </Section>
    </div>
  );
}
