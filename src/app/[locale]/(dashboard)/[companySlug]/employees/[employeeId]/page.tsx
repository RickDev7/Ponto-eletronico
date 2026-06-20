import { getLocale, getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { requireCompanyContext } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { LOCALE_DATE_MAP } from "@/lib/i18n/metadata";
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Clock,
  ClipboardList,
  CheckCircle2,
  AlertCircle,
  Calendar,
  FileSpreadsheet,
  TrendingUp,
  Timer,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { ServiceType, TaskStatus } from "@/types";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("employees");
  return { title: t("detail.pageTitle") };
}

interface PageProps {
  params: Promise<{ companySlug: string; employeeId: string }>;
}

const STATUS_COLORS: Record<TaskStatus, string> = {
  draft: "text-muted-foreground",
  scheduled: "text-blue-600",
  in_progress: "text-amber-600",
  completed: "text-emerald-600",
  cancelled: "text-destructive",
};

function formatDuration(
  start: string,
  end: string | null,
  t: Awaited<ReturnType<typeof getTranslations>>,
) {
  if (!end) return t("active");
  const diff = new Date(end).getTime() - new Date(start).getTime();
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  return h > 0
    ? t("durationHours", { hours: h, minutes: m })
    : t("durationMinutes", { minutes: m });
}

export default async function EmployeeDetailPage({ params }: PageProps) {
  const { companySlug, employeeId } = await params;
  const [t, tNav, tStatus, tCheckIn, tServiceTypes, locale] = await Promise.all([
    getTranslations("employees"),
    getTranslations("navigation"),
    getTranslations("status"),
    getTranslations("tasks.checkIn"),
    getTranslations("serviceTypes"),
    getLocale(),
  ]);
  const dateLocale = LOCALE_DATE_MAP[locale] ?? "en-US";
  const ctx = await requireCompanyContext({ slug: companySlug, minRole: "supervisor" });

  const supabase = await createClient();

  const { data: employee } = await supabase
    .from("employees")
    .select("*")
    .eq("id", employeeId)
    .eq("company_id", ctx.company.id)
    .single();

  if (!employee) notFound();

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoIso = thirtyDaysAgo.toISOString();

  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  const ninetyDaysAgoIso = ninetyDaysAgo.toISOString();

  const [{ data: assignments }, { data: recentCheckIns }, { data: allCheckIns90 }] =
    await Promise.all([
      supabase
        .from("task_assignments")
        .select(`
          task:tasks(
            id, title, status, service_type, scheduled_date, priority,
            address:addresses(street, city)
          )
        `)
        .eq("employee_id", employeeId)
        .eq("company_id", ctx.company.id)
        .order("assigned_at", { ascending: false })
        .limit(20),
      supabase
        .from("check_ins")
        .select(`
          id, check_in_at, check_out_at, check_in_notes, check_out_notes,
          task:tasks(title)
        `)
        .eq("employee_id", employeeId)
        .eq("company_id", ctx.company.id)
        .gte("check_in_at", thirtyDaysAgoIso)
        .order("check_in_at", { ascending: false })
        .limit(15),
      supabase
        .from("check_ins")
        .select("check_in_at, check_out_at")
        .eq("employee_id", employeeId)
        .eq("company_id", ctx.company.id)
        .gte("check_in_at", ninetyDaysAgoIso)
        .not("check_out_at", "is", null),
    ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tasks = (assignments ?? []).map((a: any) =>
    Array.isArray(a.task) ? a.task[0] : a.task,
  ).filter(Boolean);

  const totalCheckIns = recentCheckIns?.length ?? 0;
  const completedTasks = tasks.filter((t) => t?.status === "completed").length;
  const activeTasks = tasks.filter(
    (t) => t?.status === "scheduled" || t?.status === "in_progress",
  ).length;
  const totalTasks = tasks.length;
  const completionRate = totalTasks > 0
    ? Math.round((completedTasks / totalTasks) * 100)
    : 0;

  const totalMinutes = (recentCheckIns ?? []).reduce((acc, ci) => {
    if (!ci.check_out_at) return acc;
    return acc + Math.floor(
      (new Date(ci.check_out_at).getTime() - new Date(ci.check_in_at).getTime()) / 60_000,
    );
  }, 0);
  const totalHours = Math.floor(totalMinutes / 60);

  const completedCIs = allCheckIns90 ?? [];
  const avgMinutes = completedCIs.length
    ? Math.round(
        completedCIs.reduce((acc, ci) => {
          if (!ci.check_out_at) return acc;
          return acc + (new Date(ci.check_out_at).getTime() - new Date(ci.check_in_at).getTime()) / 60_000;
        }, 0) / completedCIs.length,
      )
    : 0;
  const avgHours = Math.floor(avgMinutes / 60);
  const avgMins = avgMinutes % 60;

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <Link
        href={`/${companySlug}/employees`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="size-4" />
        {tNav("employees")}
      </Link>

      <div className="flex items-start gap-4">
        <div className="size-14 rounded-2xl bg-primary/10 flex items-center justify-center text-xl font-bold text-primary shrink-0">
          {(employee.full_name ?? "?")[0].toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h1 className="text-lg font-semibold">{employee.full_name}</h1>
              {employee.employee_number && (
                <p className="text-xs font-mono text-muted-foreground">
                  #{employee.employee_number}
                </p>
              )}
            </div>
            <Badge
              variant={employee.status === "active" ? "outline" : "secondary"}
              className={employee.status === "active" ? "text-emerald-600 border-emerald-200" : ""}
            >
              {employee.status === "active"
                ? t("status.active")
                : t("status.inactive")}
            </Badge>
          </div>
          <div className="flex flex-wrap gap-3 mt-2 text-sm text-muted-foreground">
            {employee.email && (
              <span className="flex items-center gap-1">
                <Mail className="size-3.5" />
                {employee.email}
              </span>
            )}
            {employee.phone && (
              <span className="flex items-center gap-1">
                <Phone className="size-3.5" />
                {employee.phone}
              </span>
            )}
            {employee.address && (
              <span className="flex items-center gap-1">
                <MapPin className="size-3.5" />
                {employee.address}
              </span>
            )}
          </div>
        </div>
      </div>

      <Link
        href={`/${companySlug}/employees/${employeeId}/timesheet`}
        className="inline-flex items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-medium hover:bg-muted transition-colors w-fit"
      >
        <FileSpreadsheet className="size-4" />
        {t("detail.viewTimesheet")}
      </Link>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { label: t("detail.stats.totalTasks"), value: String(totalTasks), icon: ClipboardList, color: "text-primary" },
          { label: t("detail.stats.activeTasks"), value: String(activeTasks), icon: AlertCircle, color: "text-amber-600" },
          { label: t("detail.stats.completed"), value: String(completedTasks), icon: CheckCircle2, color: "text-emerald-600" },
          { label: t("detail.stats.completionRate"), value: `${completionRate}%`, icon: TrendingUp, color: completionRate >= 80 ? "text-emerald-600" : completionRate >= 50 ? "text-amber-600" : "text-destructive" },
          { label: t("detail.stats.hours30Days"), value: `${totalHours}h`, icon: Clock, color: "text-blue-600" },
          { label: t("detail.stats.avgCheckIn90Days"), value: avgMinutes > 0 ? (avgHours > 0 ? `${avgHours}h ${avgMins}m` : `${avgMins}m`) : "—", icon: Timer, color: "text-violet-600" },
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

      {totalTasks > 0 && (
        <div className="rounded-xl border p-4 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground font-medium">{t("detail.stats.completionRate")}</span>
            <span className="font-bold">{completionRate}%</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                completionRate >= 80 ? "bg-emerald-500" : completionRate >= 50 ? "bg-amber-500" : "bg-destructive"
              }`}
              style={{ width: `${completionRate}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {t("detail.completionSummary", { completed: completedTasks, total: totalTasks })}
          </p>
        </div>
      )}

      <Separator />

      <section className="space-y-3">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <ClipboardList className="size-4 text-muted-foreground" />
          {t("detail.tasksHeading", { count: tasks.length })}
        </h2>
        {tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground rounded-xl border border-dashed p-6 text-center">
            {t("detail.noTasksAssigned")}
          </p>
        ) : (
          <div className="space-y-1.5">
            {tasks.map((task) => {
              if (!task) return null;
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const addr = Array.isArray(task.address) ? task.address[0] : task.address as any;
              const status = task.status as TaskStatus;
              return (
                <Link
                  key={task.id}
                  href={`/${companySlug}/tasks/${task.id}`}
                  className="flex items-center gap-3 rounded-xl border px-3 py-2.5 hover:border-primary/30 hover:bg-muted/30 transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                      {task.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {tServiceTypes(task.service_type as ServiceType)}
                      {addr?.city && ` · ${addr.city}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="size-3" />
                      {new Date(task.scheduled_date).toLocaleDateString(dateLocale, {
                        day: "2-digit", month: "2-digit",
                      })}
                    </span>
                    <span className={`text-xs font-medium ${STATUS_COLORS[status] ?? STATUS_COLORS.draft}`}>
                      {tStatus(status)}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {totalCheckIns > 0 && (
        <>
          <Separator />
          <section className="space-y-3">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Clock className="size-4 text-muted-foreground" />
              {t("detail.checkInsHeading", { count: totalCheckIns })}
            </h2>
            <div className="space-y-1.5">
              {(recentCheckIns ?? []).map((ci) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const taskTitle = Array.isArray(ci.task) ? (ci.task[0] as any)?.title : (ci.task as any)?.title;
                return (
                  <div
                    key={ci.id}
                    className="rounded-xl border px-3 py-2.5 space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium truncate">{taskTitle ?? "—"}</p>
                      <Badge
                        variant="outline"
                        className={`text-xs ${!ci.check_out_at ? "border-amber-300 text-amber-700" : ""}`}
                      >
                        {formatDuration(ci.check_in_at, ci.check_out_at, tCheckIn)}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(ci.check_in_at).toLocaleDateString(dateLocale, {
                        day: "2-digit", month: "2-digit", year: "numeric",
                      })}{" "}
                      ·{" "}
                      {new Date(ci.check_in_at).toLocaleTimeString(dateLocale, {
                        hour: "2-digit", minute: "2-digit",
                      })}
                      {ci.check_out_at && ` – ${new Date(ci.check_out_at).toLocaleTimeString(dateLocale, { hour: "2-digit", minute: "2-digit" })}`}
                    </p>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground text-center">
              {t("detail.totalHoursLastMonth", {
                hours: totalHours,
                minutes: totalMinutes % 60,
              })}
            </p>
          </section>
        </>
      )}
    </div>
  );
}
