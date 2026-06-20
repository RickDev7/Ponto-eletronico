import { getLocale, getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { ChevronLeft, ChevronRight, Users } from "lucide-react";
import { requireCompanyContext } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { LOCALE_DATE_MAP } from "@/lib/i18n/metadata";
import type { ServiceType, TaskStatus } from "@/types";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("schedule");
  return { title: t("title") };
}

interface PageProps {
  params: Promise<{ companySlug: string }>;
  searchParams: Promise<{ week?: string }>;
}

const STATUS_COLOR: Record<TaskStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  scheduled: "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300",
  in_progress: "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300",
  completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
  cancelled: "bg-destructive/10 text-destructive",
};

function weekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function iso(date: Date) {
  return date.toISOString().slice(0, 10);
}

export default async function SchedulePage({ params, searchParams }: PageProps) {
  const [{ companySlug }, sp] = await Promise.all([params, searchParams]);
  const [t, tStatus, tServiceTypes, locale] = await Promise.all([
    getTranslations("schedule"),
    getTranslations("status"),
    getTranslations("serviceTypes"),
    getLocale(),
  ]);
  const dateLocale = LOCALE_DATE_MAP[locale] ?? "en-US";
  await requireCompanyContext({ slug: companySlug, minRole: "supervisor" });

  const baseDate = sp.week ? new Date(sp.week + "T00:00:00") : new Date();
  const monday = weekStart(baseDate);

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });

  const prevMonday = new Date(monday);
  prevMonday.setDate(monday.getDate() - 7);
  const nextMonday = new Date(monday);
  nextMonday.setDate(monday.getDate() + 7);

  const weekFrom = iso(monday);
  const weekTo = iso(days[6]);

  const supabase = await createClient();
  const { data: ctx } = await supabase.auth.getUser();

  const { data: companyMemberships } = await supabase
    .from("company_members")
    .select("company:companies(id)")
    .eq("user_id", ctx.user?.id ?? "")
    .eq("status", "active");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const company = (companyMemberships ?? []).find((m: any) => {
    const c = Array.isArray(m.company) ? m.company[0] : m.company;
    return c;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any;

  const companyId = (Array.isArray(company?.company) ? company.company[0] : company?.company)?.id;

  const [{ data: employees }, { data: assignments }] = await Promise.all([
    supabase
      .from("employees")
      .select("id, full_name")
      .eq("company_id", companyId)
      .eq("status", "active")
      .order("full_name"),

    supabase
      .from("task_assignments")
      .select(`
        employee_id,
        task:tasks(
          id, title, status, service_type, scheduled_date, priority
        )
      `)
      .eq("company_id", companyId)
      .gte("tasks.scheduled_date", weekFrom)
      .lte("tasks.scheduled_date", weekTo),
  ]);

  type TaskEntry = { id: string; title: string; status: string; service_type: string; scheduled_date: string; priority: string };
  const lookup = new Map<string, Map<string, TaskEntry[]>>();

  (employees ?? []).forEach((emp) => {
    lookup.set(emp.id, new Map());
    days.forEach((d) => lookup.get(emp.id)!.set(iso(d), []));
  });

  (assignments ?? []).forEach((a) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const task = Array.isArray(a.task) ? (a.task as any[])[0] : (a.task as any);
    if (!task || !a.employee_id) return;
    const dayMap = lookup.get(a.employee_id);
    if (!dayMap) return;
    const dayTasks = dayMap.get(task.scheduled_date) ?? [];
    dayTasks.push(task);
    dayMap.set(task.scheduled_date, dayTasks);
  });

  const today = iso(new Date());
  const weekLabel = `${monday.toLocaleDateString(dateLocale, { day: "2-digit", month: "long" })} – ${days[6].toLocaleDateString(dateLocale, { day: "2-digit", month: "long", year: "numeric" })}`;

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-base font-semibold flex items-center gap-2">
            <Users className="size-4 text-muted-foreground" />
            {t("title")}
          </h1>
          <p className="text-sm text-muted-foreground">{weekLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/${companySlug}/schedule?week=${iso(prevMonday)}`}
            className="inline-flex size-8 items-center justify-center rounded-lg border hover:bg-muted transition-colors"
          >
            <ChevronLeft className="size-4" />
          </Link>
          <Link
            href={`/${companySlug}/schedule`}
            className="rounded-lg border px-3 py-1 text-xs font-medium hover:bg-muted transition-colors"
          >
            {t("today")}
          </Link>
          <Link
            href={`/${companySlug}/schedule?week=${iso(nextMonday)}`}
            className="inline-flex size-8 items-center justify-center rounded-lg border hover:bg-muted transition-colors"
          >
            <ChevronRight className="size-4" />
          </Link>
        </div>
      </div>

      {!employees || employees.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center">
          <Users className="mx-auto size-8 mb-3 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">{t("noActiveEmployees")}</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <table className="ui-density-table w-full border-collapse min-w-[700px]">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground w-36 sticky left-0 bg-muted/40">
                  {t("employeesColumn")}
                </th>
                {days.map((day) => {
                  const dayIso = iso(day);
                  const isToday = dayIso === today;
                  return (
                    <th
                      key={dayIso}
                      className={`text-center px-2 py-2.5 text-xs font-semibold min-w-[100px] ${
                        isToday ? "text-primary" : "text-muted-foreground"
                      }`}
                    >
                      <div>{day.toLocaleDateString(dateLocale, { weekday: "short" })}</div>
                      <div
                        className={`text-sm font-bold mt-0.5 ${
                          isToday
                            ? "size-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto"
                            : ""
                        }`}
                      >
                        {day.getDate()}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {(employees ?? []).map((emp, empIdx) => {
                const dayMap = lookup.get(emp.id);
                const totalTasks = days.reduce(
                  (acc, d) => acc + (dayMap?.get(iso(d))?.length ?? 0),
                  0,
                );
                return (
                  <tr
                    key={emp.id}
                    className={`border-b last:border-0 ${empIdx % 2 === 0 ? "" : "bg-muted/10"}`}
                  >
                    <td className="px-3 py-2 sticky left-0 bg-background">
                      <Link
                        href={`/${companySlug}/employees/${emp.id}`}
                        className="flex items-center gap-2 group"
                      >
                        <div className="size-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                          {emp.full_name[0].toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium truncate group-hover:text-primary transition-colors">
                            {emp.full_name}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {t("taskCount", { count: totalTasks })}
                          </p>
                        </div>
                      </Link>
                    </td>

                    {days.map((day) => {
                      const dayIso = iso(day);
                      const isToday = dayIso === today;
                      const dayTasks = dayMap?.get(dayIso) ?? [];
                      return (
                        <td
                          key={dayIso}
                          className={`px-2 py-2 align-top ${
                            isToday ? "bg-primary/5" : ""
                          }`}
                        >
                          {dayTasks.length === 0 ? (
                            <div className="h-8 flex items-center justify-center text-muted-foreground/20">
                              —
                            </div>
                          ) : (
                            <div className="space-y-1">
                              {dayTasks.slice(0, 3).map((task) => (
                                <Link
                                  key={task.id}
                                  href={`/${companySlug}/tasks/${task.id}`}
                                  className={`block rounded px-1.5 py-1 text-[10px] font-medium leading-tight hover:opacity-80 transition-opacity truncate ${
                                    STATUS_COLOR[task.status as TaskStatus] ??
                                    STATUS_COLOR.draft
                                  }`}
                                  title={`${task.title} — ${tServiceTypes(task.service_type as ServiceType)}`}
                                >
                                  {task.title}
                                </Link>
                              ))}
                              {dayTasks.length > 3 && (
                                <span className="text-[10px] text-muted-foreground pl-1">
                                  {t("moreTasks", { count: dayTasks.length - 3 })}
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        {(["scheduled", "in_progress", "completed"] as const).map((status) => (
          <div key={status} className="flex items-center gap-1.5">
            <div className={`size-3 rounded ${STATUS_COLOR[status].split(" ")[0]}`} />
            {tStatus(status)}
          </div>
        ))}
      </div>
    </div>
  );
}
