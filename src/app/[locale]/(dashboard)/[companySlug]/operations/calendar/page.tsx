import { getTranslations } from "next-intl/server";
import { requireCompanyContext } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { CalendarView } from "@/components/features/calendar/calendar-view";
import { AppShellPage } from "@/components/design-system/layout";

interface PageProps {
  params: Promise<{ companySlug: string }>;
  searchParams: Promise<{ month?: string; year?: string }>;
}

export default async function OperationsCalendarPage({ params, searchParams }: PageProps) {
  const { companySlug } = await params;
  const { month, year } = await searchParams;
  await getTranslations("calendar");

  const ctx = await requireCompanyContext({ slug: companySlug, minRole: "supervisor" });

  const now = new Date();
  const currentYear = parseInt(year ?? String(now.getFullYear()), 10);
  const currentMonth = parseInt(month ?? String(now.getMonth() + 1), 10);

  const firstDay = new Date(currentYear, currentMonth - 1, 1);
  const lastDay = new Date(currentYear, currentMonth, 0);

  const supabase = await createClient();
  const { data: tasks } = await supabase
    .from("tasks")
    .select(`
      id, title, status, service_type, priority, scheduled_date, scheduled_start,
      address:addresses(city),
      assignments:task_assignments(employee:employees(full_name))
    `)
    .eq("company_id", ctx.company.id)
    .gte("scheduled_date", firstDay.toISOString().slice(0, 10))
    .lte("scheduled_date", lastDay.toISOString().slice(0, 10))
    .neq("status", "cancelled")
    .order("scheduled_start", { ascending: true, nullsFirst: true });

  return (
    <AppShellPage size="fluid">
      <CalendarView
        slug={companySlug}
        tasks={tasks ?? []}
        year={currentYear}
        month={currentMonth}
        today={now.toISOString().slice(0, 10)}
      />
    </AppShellPage>
  );
}
