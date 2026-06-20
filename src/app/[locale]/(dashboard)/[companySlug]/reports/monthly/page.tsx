import { getLocale, getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Download,
  TrendingUp,
} from "lucide-react";
import { requireCompanyContext } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { LOCALE_DATE_MAP } from "@/lib/i18n/metadata";
import { Separator } from "@/components/ui/separator";
import { MonthlyReportPrintButton } from "@/components/features/reports/monthly-report-print-button";
import type { ServiceType } from "@/types";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("reports");
  return { title: t("monthly.title") };
}

interface PageProps {
  params: Promise<{ companySlug: string }>;
  searchParams: Promise<{ month?: string; year?: string }>;
}

function formatMinutes(
  minutes: number,
  t: Awaited<ReturnType<typeof getTranslations>>,
) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0
    ? t("durationHours", { hours: h, minutes: m })
    : t("durationMinutes", { minutes: m });
}

export default async function MonthlyReportPage({ params, searchParams }: PageProps) {
  const [{ companySlug }, sp] = await Promise.all([params, searchParams]);
  const [t, tNav, tCheckIn, tServiceTypes, locale] = await Promise.all([
    getTranslations("reports.monthly"),
    getTranslations("navigation"),
    getTranslations("tasks.checkIn"),
    getTranslations("serviceTypes"),
    getLocale(),
  ]);
  const dateLocale = LOCALE_DATE_MAP[locale] ?? "en-US";
  const ctx = await requireCompanyContext({ slug: companySlug, minRole: "supervisor" });

  const now = new Date();
  const year = parseInt(sp.year ?? String(now.getFullYear()), 10);
  const month = parseInt(sp.month ?? String(now.getMonth() + 1), 10);

  const monthStart = new Date(year, month - 1, 1).toISOString().slice(0, 10);
  const monthEnd = new Date(year, month, 0).toISOString().slice(0, 10);
  const monthName = new Date(year, month - 1, 1).toLocaleDateString(dateLocale, {
    month: "long",
    year: "numeric",
  });

  const supabase = await createClient();

  const [{ data: tasks }, { data: checkIns }] = await Promise.all([
    supabase
      .from("tasks")
      .select(`
        id, title, status, service_type, scheduled_date, priority,
        address:addresses(street, city, client:clients(name)),
        assignments:task_assignments(employee:employees(full_name))
      `)
      .eq("company_id", ctx.company.id)
      .gte("scheduled_date", monthStart)
      .lte("scheduled_date", monthEnd)
      .neq("status", "cancelled")
      .order("scheduled_date"),

    supabase
      .from("check_ins")
      .select(`
        id, check_in_at, check_out_at,
        employee:employees(full_name),
        task:tasks(title, service_type)
      `)
      .eq("company_id", ctx.company.id)
      .gte("check_in_at", new Date(year, month - 1, 1).toISOString())
      .lte("check_in_at", new Date(year, month, 0, 23, 59, 59).toISOString()),
  ]);

  const allTasks = tasks ?? [];
  const allCheckIns = checkIns ?? [];

  const totalTasks = allTasks.length;
  const completedTasks = allTasks.filter((t) => t.status === "completed").length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const totalMinutes = allCheckIns.reduce((acc, ci) => {
    if (!ci.check_out_at) return acc;
    return acc + Math.floor(
      (new Date(ci.check_out_at).getTime() - new Date(ci.check_in_at).getTime()) / 60_000,
    );
  }, 0);

  const byService = new Map<string, { tasks: number; completed: number; minutes: number }>();
  allTasks.forEach((t) => {
    const st = t.service_type;
    const existing = byService.get(st) ?? { tasks: 0, completed: 0, minutes: 0 };
    byService.set(st, {
      tasks: existing.tasks + 1,
      completed: existing.completed + (t.status === "completed" ? 1 : 0),
      minutes: existing.minutes,
    });
  });
  allCheckIns.forEach((ci) => {
    if (!ci.check_out_at) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const task = Array.isArray(ci.task) ? (ci.task as any[])[0] : (ci.task as any);
    const st = task?.service_type;
    if (!st) return;
    const mins = Math.floor(
      (new Date(ci.check_out_at).getTime() - new Date(ci.check_in_at).getTime()) / 60_000,
    );
    const existing = byService.get(st) ?? { tasks: 0, completed: 0, minutes: 0 };
    byService.set(st, { ...existing, minutes: existing.minutes + mins });
  });

  const byEmployee = new Map<string, { name: string; tasks: number; minutes: number }>();
  allCheckIns.forEach((ci) => {
    if (!ci.check_out_at) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const emp = Array.isArray(ci.employee) ? (ci.employee as any[])[0] : (ci.employee as any);
    if (!emp?.full_name) return;
    const mins = Math.floor(
      (new Date(ci.check_out_at).getTime() - new Date(ci.check_in_at).getTime()) / 60_000,
    );
    const existing = byEmployee.get(emp.full_name) ?? { name: emp.full_name, tasks: 0, minutes: 0 };
    byEmployee.set(emp.full_name, { ...existing, minutes: existing.minutes + mins, tasks: existing.tasks + 1 });
  });

  const prevDate = new Date(year, month - 2, 1);
  const nextDate = new Date(year, month, 1);
  const prevHref = `/${companySlug}/reports/monthly?year=${prevDate.getFullYear()}&month=${prevDate.getMonth() + 1}`;
  const nextHref = `/${companySlug}/reports/monthly?year=${nextDate.getFullYear()}&month=${nextDate.getMonth() + 1}`;
  const csvHref = `/${companySlug}/reports/export?type=checkins&from=${monthStart}&to=${monthEnd}`;

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6" id="monthly-report">
      <Link
        href={`/${companySlug}/reports`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="size-4" />
        {tNav("reports")}
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{ctx.company.name}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={prevHref} className="inline-flex size-8 items-center justify-center rounded-lg border hover:bg-muted transition-colors text-sm">‹</Link>
          <span className="text-sm font-medium min-w-32 text-center">{monthName}</span>
          <Link href={nextHref} className="inline-flex size-8 items-center justify-center rounded-lg border hover:bg-muted transition-colors text-sm">›</Link>
        </div>
      </div>

      <div className="flex gap-2">
        <a
          href={csvHref}
          className="inline-flex items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-medium hover:bg-muted transition-colors"
        >
          <Download className="size-4" />
          {t("exportCsv")}
        </a>
        <MonthlyReportPrintButton companyName={ctx.company.name} monthName={monthName} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: t("stats.totalTasks"), value: totalTasks, icon: TrendingUp, color: "text-primary" },
          { label: t("stats.completed"), value: completedTasks, icon: CheckCircle2, color: "text-emerald-600" },
          { label: t("stats.completionRate"), value: `${completionRate}%`, icon: TrendingUp, color: completionRate >= 80 ? "text-emerald-600" : completionRate >= 50 ? "text-amber-600" : "text-destructive" },
          { label: t("stats.totalHours"), value: formatMinutes(totalMinutes, tCheckIn), icon: Clock, color: "text-blue-600" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border p-3 space-y-1.5">
            <div className="flex items-center gap-1.5">
              <s.icon className={`size-3.5 ${s.color}`} />
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
            <p className="text-xl font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      <Separator />

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">{t("byService")}</h2>
        {byService.size === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noData")}</p>
        ) : (
          <div className="space-y-2">
            {Array.from(byService.entries()).map(([st, stats]) => {
              const label = tServiceTypes(st as ServiceType);
              const rate = stats.tasks > 0 ? Math.round((stats.completed / stats.tasks) * 100) : 0;
              return (
                <div key={st} className="rounded-xl border px-4 py-3 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{label}</p>
                    <p className="text-xs text-muted-foreground">
                      {t("serviceStats", { tasks: stats.tasks, completed: stats.completed })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {stats.minutes > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {formatMinutes(stats.minutes, tCheckIn)}
                      </span>
                    )}
                    <span
                      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${
                        rate >= 80
                          ? "border-emerald-300 text-emerald-700"
                          : rate >= 50
                            ? "border-amber-300 text-amber-700"
                            : ""
                      }`}
                    >
                      {rate}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {byEmployee.size > 0 && (
        <>
          <Separator />
          <section className="space-y-3">
            <h2 className="text-sm font-semibold">{t("byEmployee")}</h2>
            <div className="space-y-2">
              {Array.from(byEmployee.values())
                .sort((a, b) => b.minutes - a.minutes)
                .map((emp) => (
                  <div key={emp.name} className="rounded-xl border px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="size-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                        {emp.name[0].toUpperCase()}
                      </div>
                      <p className="text-sm font-medium truncate">{emp.name}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs text-muted-foreground">
                        {t("checkInsCount", { count: emp.tasks })}
                      </span>
                      <span className="text-sm font-semibold">
                        {formatMinutes(emp.minutes, tCheckIn)}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </section>
        </>
      )}

      {allTasks.length > 0 && (
        <>
          <Separator />
          <section className="space-y-3">
            <h2 className="text-sm font-semibold">{t("allTasksInMonth", { month: monthName })}</h2>
            <div className="space-y-1.5">
              {allTasks.map((task) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const addr = Array.isArray(task.address) ? (task.address as any[])[0] : (task.address as any);
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const client = Array.isArray(addr?.client) ? (addr.client as any[])[0] : addr?.client;
                const isCompleted = task.status === "completed";
                return (
                  <Link
                    key={task.id}
                    href={`/${companySlug}/tasks/${task.id}`}
                    className="flex items-center gap-3 rounded-xl border px-3 py-2.5 hover:border-primary/30 hover:bg-muted/30 transition-colors group"
                  >
                    <CheckCircle2 className={`size-4 shrink-0 ${isCompleted ? "text-emerald-500" : "text-muted-foreground/30"}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                        {task.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {tServiceTypes(task.service_type as ServiceType)}
                        {addr?.city && ` · ${addr.city}`}
                        {client?.name && ` · ${client.name}`}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {new Date(task.scheduled_date).toLocaleDateString(dateLocale, { day: "2-digit", month: "2-digit" })}
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
