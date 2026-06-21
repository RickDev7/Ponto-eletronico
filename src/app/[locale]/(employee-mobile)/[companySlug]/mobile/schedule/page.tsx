import { getLocale, getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { requireEmployeeContext } from "@/lib/auth/guards";
import { FieldScheduleView } from "@/components/features/field-execution/field-schedule-view";
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
  const locale = await getLocale();
  const ctx = await requireEmployeeContext(companySlug);
  const schedule = await loadEmployeeSchedule(ctx.company.id, ctx.employee.id);

  return (
    <div className="p-4 pb-6">
      <FieldScheduleView
        slug={companySlug}
        locale={locale}
        today={schedule.today}
        todayTasks={schedule.todayTasks}
        upcomingTasks={schedule.upcomingTasks}
        weekTasks={schedule.weekTasks}
        openCheckIn={schedule.openCheckIn}
        activeTaskId={schedule.activeTaskId}
        variant="mobile"
      />
    </div>
  );
}
