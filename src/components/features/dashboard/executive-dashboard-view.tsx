"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  Briefcase,
  CalendarCheck,
  Clock,
  Euro,
  FileWarning,
  MapPin,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react";
import {
  Bar,
  BarChart,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ExecutiveDashboardData } from "@/lib/dashboard/load-executive-dashboard-data";
import { formatMoney } from "@/lib/finance/utils";
import { cn } from "@/lib/utils";

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

const KPI_ICONS: Record<string, LucideIcon> = {
  todayServices: CalendarCheck,
  completedToday: TrendingUp,
  activeEmployees: Users,
  hoursWorked: Clock,
  monthlyRevenue: Euro,
  openInvoices: FileWarning,
};

const KPI_ACCENT: Record<string, string> = {
  blue: "text-[#2563EB]",
  emerald: "text-[#10B981]",
  amber: "text-[#F59E0B]",
  rose: "text-[#EF4444]",
  neutral: "text-foreground",
};

interface ExecutiveDashboardViewProps {
  slug: string;
  data: ExecutiveDashboardData;
  locale: string;
}

function Panel({
  title,
  children,
  className,
  action,
}: {
  title: string;
  children: ReactNode;
  className?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className={cn("flex h-full flex-col overflow-hidden rounded-xl border border-[#1F1F1F] bg-[#111111]", className)}>
      <div className="flex items-center justify-between border-b border-[#1F1F1F] px-4 py-3">
        <h3 className="text-sm font-medium text-foreground">{title}</h3>
        {action}
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-4">{children}</div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  trend,
  trendPositive,
  accent,
  icon: Icon,
}: {
  label: string;
  value: string;
  trend?: string;
  trendPositive?: boolean;
  accent: string;
  icon: LucideIcon;
}) {
  return (
    <div className="relative flex h-[120px] flex-col justify-between overflow-hidden rounded-xl border border-[#1F1F1F] bg-[#111111] p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
        <Icon className={cn("size-8 opacity-20", KPI_ACCENT[accent])} strokeWidth={1.5} />
      </div>
      <div>
        <p className={cn("text-3xl font-semibold tabular-nums tracking-tight", KPI_ACCENT[accent])}>{value}</p>
        {trend && (
          <p className={cn("mt-1 text-xs font-medium tabular-nums", trendPositive ? "text-[#10B981]" : "text-[#EF4444]")}>
            {trend}
          </p>
        )}
      </div>
    </div>
  );
}

function OperationalMap({ pins }: { pins: ExecutiveDashboardData["mapPins"] }) {
  if (!pins.length) {
    return (
      <div className="flex h-full min-h-[220px] flex-col items-center justify-center rounded-lg border border-dashed border-[#1F1F1F] bg-[#0A0A0A] text-center">
        <MapPin className="mb-2 size-8 text-muted-foreground/40" />
        <p className="text-xs text-muted-foreground">Mapa operacional</p>
        <p className="mt-1 max-w-[200px] text-[10px] text-muted-foreground/70">Integração Google Maps preparada</p>
      </div>
    );
  }

  const lats = pins.map((p) => p.lat);
  const lngs = pins.map((p) => p.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const latSpan = maxLat - minLat || 0.01;
  const lngSpan = maxLng - minLng || 0.01;

  return (
    <div className="relative h-full min-h-[220px] overflow-hidden rounded-lg border border-[#1F1F1F] bg-[#0A0A0A]">
      <div className="absolute inset-0 bg-[linear-gradient(#1F1F1F_1px,transparent_1px),linear-gradient(90deg,#1F1F1F_1px,transparent_1px)] bg-size-[24px_24px] opacity-30" />
      {pins.map((pin) => {
        const top = ((maxLat - pin.lat) / latSpan) * 80 + 10;
        const left = ((pin.lng - minLng) / lngSpan) * 80 + 10;
        return (
          <div
            key={pin.id}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ top: `${top}%`, left: `${left}%` }}
            title={pin.label}
          >
            <span
              className={cn(
                "flex size-3 rounded-full ring-2 ring-[#111111]",
                pin.type === "employee" ? "bg-[#2563EB]" : "bg-[#10B981]",
              )}
            />
          </div>
        );
      })}
      <div className="absolute bottom-2 left-2 flex gap-3 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-[#2563EB]" /> Funcionários</span>
        <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-[#10B981]" /> Serviços</span>
      </div>
    </div>
  );
}

export function ExecutiveDashboardView({ slug, data, locale }: ExecutiveDashboardViewProps) {
  const t = useTranslations("dashboard.executive");
  const tStatus = useTranslations("status");

  const kpiLabels: Record<string, string> = {
    todayServices: t("kpis.todayServices"),
    completedToday: t("kpis.completedToday"),
    activeEmployees: t("kpis.activeEmployees"),
    hoursWorked: t("kpis.hoursWorked"),
    monthlyRevenue: t("kpis.monthlyRevenue"),
    openInvoices: t("kpis.openInvoices"),
  };

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-4 p-4 lg:p-6">
      {/* Row 1 — KPIs */}
      <motion.div variants={fadeUp} className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {data.kpis.map((kpi) => (
          <KpiCard
            key={kpi.id}
            label={kpiLabels[kpi.id] ?? kpi.id}
            value={kpi.value}
            trend={kpi.trend}
            trendPositive={kpi.trendPositive}
            accent={kpi.accent}
            icon={KPI_ICONS[kpi.id] ?? Briefcase}
          />
        ))}
      </motion.div>

      {/* Row 2 — 40% | 35% | 25% */}
      <motion.div variants={fadeUp} className="grid gap-3 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <Panel title={t("panels.todayServices")}>
            {data.todayServices.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("empty.todayServices")}</p>
            ) : (
              <ol className="relative space-y-0 border-l border-[#1F1F1F] pl-4">
                {data.todayServices.map((svc, i) => (
                  <li key={svc.id} className="relative pb-4 last:pb-0">
                    <span className="absolute -left-[21px] top-1 size-2.5 rounded-full border-2 border-[#111111] bg-[#2563EB]" />
                    <Link href={`/${slug}/tasks/${svc.id}`} className="group block">
                      <p className="text-xs font-medium tabular-nums text-[#2563EB]">{svc.time}</p>
                      <p className="text-sm font-medium group-hover:text-primary">{svc.title}</p>
                      <p className="text-xs text-muted-foreground">{svc.clientName} · {svc.employeeName}</p>
                      <span className="mt-1 inline-block rounded-md bg-[#1F1F1F] px-2 py-0.5 text-[10px] text-muted-foreground">
                        {tStatus(svc.status as "scheduled")}
                      </span>
                    </Link>
                    {i < data.todayServices.length - 1 && <div className="mt-4 h-px bg-[#1F1F1F]" />}
                  </li>
                ))}
              </ol>
            )}
          </Panel>
        </div>
        <div className="lg:col-span-4">
          <Panel title={t("panels.weekPlanning")}>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={data.weekPlanning} barGap={2}>
                <XAxis dataKey="label" tick={{ fill: "#737373", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#737373", fontSize: 10 }} axisLine={false} tickLine={false} width={24} />
                <Tooltip
                  contentStyle={{ background: "#111111", border: "1px solid #1F1F1F", borderRadius: 8, fontSize: 12 }}
                />
                <Bar dataKey="scheduled" stackId="a" fill="#6B7280" radius={[0, 0, 0, 0]} name={t("chart.scheduled")} />
                <Bar dataKey="inProgress" stackId="a" fill="#2563EB" name={t("chart.inProgress")} />
                <Bar dataKey="completed" stackId="a" fill="#10B981" name={t("chart.completed")} />
                <Bar dataKey="overdue" stackId="a" fill="#EF4444" radius={[2, 2, 0, 0]} name={t("chart.overdue")} />
              </BarChart>
            </ResponsiveContainer>
          </Panel>
        </div>
        <div className="lg:col-span-3">
          <Panel title={t("panels.operationalMap")}>
            <OperationalMap pins={data.mapPins} />
          </Panel>
        </div>
      </motion.div>

      {/* Row 3 — 25% x 4 */}
      <motion.div variants={fadeUp} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Panel title={t("panels.taskStatus")}>
          {data.taskStatus.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("empty.noData")}</p>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={data.taskStatus} dataKey="value" nameKey="key" innerRadius={50} outerRadius={70} paddingAngle={2}>
                  {data.taskStatus.map((entry) => (
                    <Cell key={entry.key} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "#111111", border: "1px solid #1F1F1F", borderRadius: 8, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
          <div className="mt-2 grid grid-cols-2 gap-1 text-[10px] text-muted-foreground">
            {data.taskStatus.map((s) => (
              <span key={s.key} className="flex items-center gap-1">
                <span className="size-2 rounded-full" style={{ background: s.color }} />
                {t(`taskStatus.${s.key}`)} ({s.value})
              </span>
            ))}
          </div>
        </Panel>

        <Panel title={t("panels.financeSummary")}>
          {data.finance ? (
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between"><dt className="text-muted-foreground">{t("finance.monthlyRevenue")}</dt><dd className="font-semibold tabular-nums">{formatMoney(data.finance.monthlyRevenueCents, "EUR", locale)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">{t("finance.projected")}</dt><dd className="font-semibold tabular-nums">{formatMoney(data.finance.projectedRevenueCents, "EUR", locale)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">{t("finance.openInvoices")}</dt><dd className="font-semibold tabular-nums">{formatMoney(data.finance.openInvoicesCents, "EUR", locale)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">{t("finance.overdueInvoices")}</dt><dd className="font-semibold tabular-nums text-[#EF4444]">{formatMoney(data.finance.overdueInvoicesCents, "EUR", locale)}</dd></div>
            </dl>
          ) : (
            <p className="text-sm text-muted-foreground">{t("empty.financeRestricted")}</p>
          )}
        </Panel>

        <Panel title={t("panels.workforceAllocation")}>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between"><dt className="text-muted-foreground">{t("workforce.onService")}</dt><dd className="font-semibold tabular-nums text-[#2563EB]">{data.workforce.onService}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">{t("workforce.available")}</dt><dd className="font-semibold tabular-nums text-[#10B981]">{data.workforce.available}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">{t("workforce.absent")}</dt><dd className="font-semibold tabular-nums text-[#F59E0B]">{data.workforce.absent}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">{t("workforce.vacation")}</dt><dd className="font-semibold tabular-nums">{data.workforce.vacation}</dd></div>
          </dl>
        </Panel>

        <Panel
          title={t("panels.alerts")}
          className={data.alerts.length > 0 ? "border-[#EF4444]/30" : undefined}
        >
          {data.alerts.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("empty.noAlerts")}</p>
          ) : (
            <ul className="space-y-2">
              {data.alerts.map((alert) => (
                <li key={alert.id}>
                  <Link
                    href={alert.href}
                    className={cn(
                      "flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-colors hover:bg-[#1F1F1F]",
                      alert.type === "danger" && "border-[#EF4444]/30 bg-[#EF4444]/5",
                      alert.type === "warning" && "border-[#F59E0B]/30 bg-[#F59E0B]/5",
                    )}
                  >
                    <AlertTriangle className={cn("size-3.5 shrink-0", alert.type === "danger" ? "text-[#EF4444]" : "text-[#F59E0B]")} />
                    <span className="flex-1">{t(`alerts.${alert.messageKey}`, { count: alert.count })}</span>
                    <span className="font-bold tabular-nums">{alert.count}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </motion.div>

      {/* Row 4 — 50% | 50% */}
      <motion.div variants={fadeUp} className="grid gap-3 lg:grid-cols-2">
        <Panel title={t("panels.recentActivity")}>
          {data.activities.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("empty.noActivity")}</p>
          ) : (
            <ul className="space-y-3">
              {data.activities.map((act) => (
                <li key={act.id}>
                  <Link href={act.href} className="flex gap-3 rounded-lg p-2 transition-colors hover:bg-[#1F1F1F]">
                    <div className="mt-0.5 size-2 shrink-0 rounded-full bg-[#2563EB]" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{act.title}</p>
                      <p className="truncate text-xs text-muted-foreground">{t(`activityTypes.${act.type}`)} · {act.subtitle}</p>
                    </div>
                    <time className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
                      {new Date(act.at).toLocaleDateString(locale, { day: "2-digit", month: "short" })}
                    </time>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title={t("panels.revenueForecast")}>
          {data.showFinance && data.forecast.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={data.forecast}>
                <XAxis dataKey="label" tick={{ fill: "#737373", fontSize: 10 }} axisLine={false} tickLine={false} interval={4} />
                <YAxis tick={{ fill: "#737373", fontSize: 10 }} axisLine={false} tickLine={false} width={48} tickFormatter={(v) => `${Math.round(v / 100)}€`} />
                <Tooltip
                  formatter={(v: number) => formatMoney(v, "EUR", locale)}
                  contentStyle={{ background: "#111111", border: "1px solid #1F1F1F", borderRadius: 8, fontSize: 12 }}
                />
                <Line type="monotone" dataKey="amountCents" stroke="#2563EB" strokeWidth={2} dot={false} name={t("finance.forecast")} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground">{t("empty.noForecast")}</p>
          )}
        </Panel>
      </motion.div>
    </motion.div>
  );
}
