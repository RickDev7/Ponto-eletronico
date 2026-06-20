import { getLocale, getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock, Download, TrendingUp } from "lucide-react";
import { requireCompanyContext } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { LOCALE_DATE_MAP } from "@/lib/i18n/metadata";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("employees");
  return { title: t("timesheet.title") };
}

interface PageProps {
  params: Promise<{ companySlug: string; employeeId: string }>;
  searchParams: Promise<{ month?: string; year?: string }>;
}

function formatMinutes(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}min`;
  return m === 0 ? `${h}h` : `${h}h ${m}min`;
}

export default async function TimesheetPage({ params, searchParams }: PageProps) {
  const [{ companySlug, employeeId }, filters] = await Promise.all([
    params,
    searchParams,
  ]);
  const ctx = await requireCompanyContext({
    slug: companySlug,
    minRole: "supervisor",
  });
  const t = await getTranslations("employees.timesheet");
  const tStatus = await getTranslations("status");
  const locale = await getLocale();
  const dateLocale = LOCALE_DATE_MAP[locale] ?? "en-US";

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString(dateLocale, {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString(dateLocale, {
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
    });
  }

  const now = new Date();
  const year = parseInt(filters.year ?? String(now.getFullYear()), 10);
  const month = parseInt(filters.month ?? String(now.getMonth() + 1), 10);

  const monthStart = new Date(year, month - 1, 1).toISOString();
  const monthEnd = new Date(year, month, 0, 23, 59, 59).toISOString();

  const supabase = await createClient();

  const { data: employee } = await supabase
    .from("employees")
    .select("id, full_name, employee_number")
    .eq("id", employeeId)
    .eq("company_id", ctx.company.id)
    .single();

  if (!employee) notFound();

  const { data: checkIns } = await supabase
    .from("check_ins")
    .select(`
      id, check_in_at, check_out_at, check_in_notes, check_out_notes,
      task:tasks(id, title, service_type,
        address:addresses(street, city))
    `)
    .eq("employee_id", employeeId)
    .eq("company_id", ctx.company.id)
    .gte("check_in_at", monthStart)
    .lte("check_in_at", monthEnd)
    .order("check_in_at", { ascending: true });

  const entries = checkIns ?? [];

  const byDay = new Map<string, { minutes: number; count: number }>();
  let totalMinutes = 0;

  entries.forEach((ci) => {
    if (!ci.check_out_at) return;
    const day = ci.check_in_at.slice(0, 10);
    const mins = Math.floor(
      (new Date(ci.check_out_at).getTime() -
        new Date(ci.check_in_at).getTime()) /
        60_000,
    );
    totalMinutes += mins;
    const existing = byDay.get(day) ?? { minutes: 0, count: 0 };
    byDay.set(day, { minutes: existing.minutes + mins, count: existing.count + 1 });
  });

  const workingDays = byDay.size;
  const avgMinutes = workingDays > 0 ? Math.floor(totalMinutes / workingDays) : 0;
  const completedEntries = entries.filter((ci) => ci.check_out_at).length;

  const prevDate = new Date(year, month - 2, 1);
  const nextDate = new Date(year, month, 1);
  const prevHref = `/${companySlug}/employees/${employeeId}/timesheet?year=${prevDate.getFullYear()}&month=${prevDate.getMonth() + 1}`;
  const nextHref = `/${companySlug}/employees/${employeeId}/timesheet?year=${nextDate.getFullYear()}&month=${nextDate.getMonth() + 1}`;
  const exportHref = `/${companySlug}/employees/${employeeId}/timesheet/export?year=${year}&month=${month}`;

  const monthName = new Date(year, month - 1, 1).toLocaleDateString(dateLocale, {
    month: "long",
    year: "numeric",
  });

  const stats = [
    {
      label: t("stats.total"),
      value: formatMinutes(totalMinutes),
      icon: Clock,
      color: "text-primary",
    },
    {
      label: t("stats.workingDays"),
      value: String(workingDays),
      icon: TrendingUp,
      color: "text-blue-600",
    },
    {
      label: t("stats.avgPerDay"),
      value: formatMinutes(avgMinutes),
      icon: Clock,
      color: "text-amber-600",
    },
    {
      label: t("stats.checkIns"),
      value: String(completedEntries),
      icon: Clock,
      color: "text-emerald-600",
    },
  ];

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6">
      <Link
        href={`/${companySlug}/employees/${employeeId}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="size-4" />
        {employee.full_name}
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{employee.full_name}</p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={prevHref}
            className="inline-flex size-8 items-center justify-center rounded-lg border hover:bg-muted transition-colors text-sm"
          >
            ‹
          </Link>
          <span className="text-sm font-medium min-w-32 text-center">{monthName}</span>
          <Link
            href={nextHref}
            className="inline-flex size-8 items-center justify-center rounded-lg border hover:bg-muted transition-colors text-sm"
          >
            ›
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border p-3 space-y-1.5">
            <div className="flex items-center gap-1.5">
              <s.icon className={`size-3.5 ${s.color}`} />
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
            <p className="text-xl font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <a
          href={exportHref}
          className="inline-flex items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-medium hover:bg-muted transition-colors"
        >
          <Download className="size-4" />
          {t("exportCsv")}
        </a>
      </div>

      <Separator />

      {entries.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center">
          <Clock className="mx-auto size-8 mb-3 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            {t("emptyMonth", { month: monthName })}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {Array.from(byDay.keys()).map((day) => {
            const dayEntries = entries.filter((ci) =>
              ci.check_in_at.startsWith(day),
            );
            const dayStats = byDay.get(day)!;

            return (
              <div key={day} className="rounded-xl border overflow-hidden">
                <div className="flex items-center justify-between bg-muted/40 px-4 py-2.5">
                  <span className="text-sm font-medium">
                    {formatDate(day + "T00:00:00")}
                  </span>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {t("checkInsCount", { count: dayStats.count })}
                    </Badge>
                    <span className="text-xs font-semibold">
                      {formatMinutes(dayStats.minutes)}
                    </span>
                  </div>
                </div>

                <div className="divide-y">
                  {dayEntries.map((ci) => {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const task = Array.isArray(ci.task) ? (ci.task as any[])[0] : ci.task as any;
                    const addr = task?.address
                      ? Array.isArray(task.address)
                        ? task.address[0]
                        : task.address
                      : null;

                    const duration = ci.check_out_at
                      ? Math.floor(
                          (new Date(ci.check_out_at).getTime() -
                            new Date(ci.check_in_at).getTime()) /
                            60_000,
                        )
                      : null;

                    return (
                      <div
                        key={ci.id}
                        className="px-4 py-3 grid grid-cols-[1fr_auto] gap-3 items-start"
                      >
                        <div className="min-w-0 space-y-0.5">
                          {task?.id ? (
                            <Link
                              href={`/${companySlug}/tasks/${task.id}`}
                              className="text-sm font-medium hover:text-primary hover:underline underline-offset-2 transition-colors truncate block"
                            >
                              {task.title}
                            </Link>
                          ) : (
                            <p className="text-sm text-muted-foreground">—</p>
                          )}
                          {addr && (
                            <p className="text-xs text-muted-foreground">
                              {addr.street}, {addr.city}
                            </p>
                          )}
                          {ci.check_in_notes && (
                            <p className="text-xs text-muted-foreground italic">
                              {ci.check_in_notes}
                            </p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs font-mono text-muted-foreground">
                            {formatTime(ci.check_in_at)}
                            {ci.check_out_at
                              ? ` – ${formatTime(ci.check_out_at)}`
                              : ""}
                          </p>
                          {duration !== null ? (
                            <p className="text-xs font-semibold mt-0.5">
                              {formatMinutes(duration)}
                            </p>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-[10px] border-amber-300 text-amber-700 mt-0.5"
                            >
                              {tStatus("in_progress")}
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {entries.length > 0 && (
        <div className="rounded-xl bg-muted/30 border p-4 flex items-center justify-between">
          <span className="text-sm font-medium">
            {t("monthlyTotal", { month: monthName })}
          </span>
          <span className="text-xl font-bold">{formatMinutes(totalMinutes)}</span>
        </div>
      )}
    </div>
  );
}
