import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { requireEmployeeContext } from "@/lib/auth/guards";
import { EmployeeScheduleTabsView } from "@/components/mobile/employee-schedule-tabs-view";
import { loadEmployeeSchedule } from "@/lib/field-execution/load-employee-schedule";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("employee.mobile.schedule");
  return { title: t("title") };
}

interface PageProps {
  params: Promise<{ companySlug: string }>;
}

export default async function MobileSchedulePage({ params }: PageProps) {
  const { companySlug } = await params;
  const ctx = await requireEmployeeContext(companySlug);
  const schedule = await loadEmployeeSchedule(ctx.company.id, ctx.employee.id);

  return (
    <EmployeeScheduleTabsView
        slug={companySlug}
        employeeId={ctx.employee.id}
        today={schedule.today}
        todayTasks={schedule.todayTasks}
        upcomingTasks={schedule.upcomingTasks}
        weekTasks={schedule.weekTasks}
        openCheckIn={schedule.openCheckIn}
        activeTaskId={schedule.activeTaskId}
    />
  );
}
