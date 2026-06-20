import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { requireCompanyContext } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { AppShellPage } from "@/components/design-system/layout/app-shell-content";
import { MeView } from "@/components/features/me/me-view";
import { WorkTimeWidget } from "@/components/features/me/work-time-widget";
import { EmployeeScheduleWidget } from "@/components/features/me/employee-schedule-widget";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("navigation");
  return { title: t("myTasks") };
}

interface PageProps {
  params: Promise<{ companySlug: string }>;
}

export default async function MinhaAreaPage({ params }: PageProps) {
  const { companySlug } = await params;
  const tNav = await getTranslations("navigation");
  const ctx = await requireCompanyContext({ slug: companySlug });

  if (!ctx.employee) {
    return (
      <AppShellPage size="default">
        <div className="flex min-h-[50vh] flex-col items-center justify-center p-8 text-center">
          <p className="text-sm text-muted-foreground">
            {tNav("noEmployeeProfile")}
          </p>
        </div>
      </AppShellPage>
    );
  }

  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const todayStart = `${today}T00:00:00.000Z`;
  const todayEnd = `${today}T23:59:59.999Z`;

  const [{ data: todayTasks }, { data: upcomingTasks }, { data: openCheckIn }, { data: todayCheckIns }] =
    await Promise.all([
      supabase
        .from("task_assignments")
        .select(`
          task:tasks(
            id, title, status, priority, service_type, scheduled_date,
            scheduled_start, scheduled_end, description,
            address:addresses(street, house_number, postal_code, city, latitude, longitude, access_notes,
              client:clients(name))
          )
        `)
        .eq("employee_id", ctx.employee.id)
        .eq("company_id", ctx.company.id),

      supabase
        .from("task_assignments")
        .select(`
          task:tasks(
            id, title, status, service_type, scheduled_date, scheduled_start,
            address:addresses(street, city)
          )
        `)
        .eq("employee_id", ctx.employee.id)
        .eq("company_id", ctx.company.id),

      supabase
        .from("check_ins")
        .select("id, check_in_at, task_id, check_in_notes")
        .eq("employee_id", ctx.employee.id)
        .eq("company_id", ctx.company.id)
        .is("check_out_at", null)
        .maybeSingle(),

      supabase
        .from("check_ins")
        .select("check_in_at, check_out_at")
        .eq("employee_id", ctx.employee.id)
        .eq("company_id", ctx.company.id)
        .gte("check_in_at", todayStart)
        .lte("check_in_at", todayEnd),
    ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allTasks: any[] = [...(todayTasks ?? []), ...(upcomingTasks ?? [])]
    .map((a) => (Array.isArray(a.task) ? a.task[0] : a.task))
    .filter(Boolean)
    .filter((t, i, arr) => arr.findIndex((x) => x.id === t.id) === i)
    .filter((t) => !["completed", "cancelled"].includes(t.status));

  const todayTaskList = allTasks.filter((t) => t.scheduled_date === today);
  const upcomingTaskList = allTasks
    .filter((t) => t.scheduled_date > today)
    .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date))
    .slice(0, 10);

  const todayMinutesWorked = (todayCheckIns ?? []).reduce((sum, ci) => {
    if (!ci.check_out_at) return sum;
    return (
      sum +
      Math.floor(
        (new Date(ci.check_out_at).getTime() - new Date(ci.check_in_at).getTime()) / 60_000,
      )
    );
  }, 0);

  return (
    <AppShellPage size="narrow">
      <div className="space-y-3">
        <EmployeeScheduleWidget
          slug={companySlug}
          today={today}
          todayTasks={todayTaskList}
          upcomingTasks={upcomingTaskList}
        />
        {(todayCheckIns ?? []).length > 0 && (
          <WorkTimeWidget todayCheckIns={todayCheckIns ?? []} />
        )}
        <MeView
          slug={companySlug}
          employee={ctx.employee}
          profile={ctx.profile}
          todayTasks={todayTaskList}
          upcomingTasks={upcomingTaskList}
          openCheckIn={openCheckIn ?? null}
          today={today}
          todayMinutesWorked={todayMinutesWorked}
        />
      </div>
    </AppShellPage>
  );
}
