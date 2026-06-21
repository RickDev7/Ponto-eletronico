import { getLocale, getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { requireCompanyContext } from "@/lib/auth/guards";
import { AppShellPage } from "@/components/design-system/layout";
import { FieldScheduleView } from "@/components/features/field-execution/field-schedule-view";
import { loadEmployeeSchedule } from "@/lib/field-execution/load-employee-schedule";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("fieldExecution.schedule");
  return { title: t("title") };
}

interface PageProps {
  params: Promise<{ companySlug: string }>;
}

export default async function FieldSchedulePage({ params }: PageProps) {
  const { companySlug } = await params;
  const locale = await getLocale();
  const ctx = await requireCompanyContext({ slug: companySlug });

  if (!ctx.employee) {
    return (
      <AppShellPage size="default">
        <p className="p-8 text-center text-sm text-muted-foreground">Perfil de colaborador necessário.</p>
      </AppShellPage>
    );
  }

  const schedule = await loadEmployeeSchedule(ctx.company.id, ctx.employee.id);

  return (
    <AppShellPage size="default" className="pb-24">
      <FieldScheduleView
        slug={companySlug}
        locale={locale}
        today={schedule.today}
        todayTasks={schedule.todayTasks}
        upcomingTasks={schedule.upcomingTasks}
        weekTasks={schedule.weekTasks}
        openCheckIn={schedule.openCheckIn}
        activeTaskId={schedule.activeTaskId}
      />
    </AppShellPage>
  );
}
