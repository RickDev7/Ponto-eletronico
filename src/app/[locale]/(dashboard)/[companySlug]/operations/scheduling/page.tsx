import { getLocale } from "next-intl/server";
import { requireCompanyContext } from "@/lib/auth/guards";
import { ROUTES } from "@/config/constants";
import { createClient } from "@/lib/supabase/server";
import { OperationsSchedulingView } from "@/components/features/operations/operations-scheduling-view";
import { loadSchedulingTasks } from "@/lib/operations/load-operations-data";
import { AppShellPage } from "@/components/design-system/layout";
import { LOCALE_DATE_MAP } from "@/lib/i18n/metadata";

interface PageProps {
  params: Promise<{ companySlug: string }>;
  searchParams: Promise<{ view?: string; week?: string; mode?: string; month?: string; year?: string }>;
}

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

export default async function OperationsSchedulingPage({ params, searchParams }: PageProps) {
  const [{ companySlug }, sp] = await Promise.all([params, searchParams]);
  const ctx = await requireCompanyContext({ slug: companySlug, minRole: "supervisor" });
  const locale = await getLocale();
  const dateLocale = LOCALE_DATE_MAP[locale] ?? "en-US";

  const mode = sp.mode === "calendar" ? "calendar" : "list";
  const view = (sp.view === "day" || sp.view === "month" ? sp.view : "week") as "day" | "week" | "month";
  const baseDate = sp.week ? new Date(sp.week + "T00:00:00") : new Date();
  const now = new Date();

  let from: string;
  let to: string;
  let rangeLabel: string;
  let prevMonday: Date;
  let nextMonday: Date;

  if (view === "day") {
    from = iso(baseDate);
    to = from;
    rangeLabel = baseDate.toLocaleDateString(dateLocale, {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    prevMonday = new Date(baseDate);
    prevMonday.setDate(baseDate.getDate() - 1);
    nextMonday = new Date(baseDate);
    nextMonday.setDate(baseDate.getDate() + 1);
  } else if (view === "month") {
    const first = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
    const last = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0);
    from = iso(first);
    to = iso(last);
    rangeLabel = first.toLocaleDateString(dateLocale, { month: "long", year: "numeric" });
    prevMonday = new Date(first);
    prevMonday.setMonth(first.getMonth() - 1);
    nextMonday = new Date(first);
    nextMonday.setMonth(first.getMonth() + 1);
  } else {
    const monday = weekStart(baseDate);
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d;
    });
    from = iso(monday);
    to = iso(days[6]);
    rangeLabel = `${monday.toLocaleDateString(dateLocale, { day: "2-digit", month: "long" })} – ${days[6].toLocaleDateString(dateLocale, { day: "2-digit", month: "long", year: "numeric" })}`;
    prevMonday = new Date(monday);
    prevMonday.setDate(monday.getDate() - 7);
    nextMonday = new Date(monday);
    nextMonday.setDate(monday.getDate() + 7);
  }

  const schedulingParams = { view, mode } as const;
  const tasks = mode === "list" ? await loadSchedulingTasks(ctx.company.id, from, to) : [];

  let calendarProps: {
    year: number;
    month: number;
    today: string;
    calendarTasks: Array<Record<string, unknown>>;
  } | undefined;

  if (mode === "calendar") {
    const currentYear = parseInt(sp.year ?? String(now.getFullYear()), 10);
    const currentMonth = parseInt(sp.month ?? String(now.getMonth() + 1), 10);
    const firstDay = new Date(currentYear, currentMonth - 1, 1);
    const lastDay = new Date(currentYear, currentMonth, 0);
    const supabase = await createClient();
    const { data: calendarTasks } = await supabase
      .from("tasks")
      .select(`
        id, title, status, service_type, priority, scheduled_date, scheduled_start,
        address:addresses(city),
        assignments:task_assignments(
          employee:employees(full_name)
        )
      `)
      .eq("company_id", ctx.company.id)
      .gte("scheduled_date", iso(firstDay))
      .lte("scheduled_date", iso(lastDay))
      .neq("status", "cancelled")
      .order("scheduled_start", { ascending: true, nullsFirst: true });

    calendarProps = {
      year: currentYear,
      month: currentMonth,
      today: now.toISOString().slice(0, 10),
      calendarTasks: (calendarTasks ?? []) as Array<Record<string, unknown>>,
    };
  }

  return (
    <AppShellPage size="fluid">
      <OperationsSchedulingView
        slug={companySlug}
        tasks={tasks}
        view={view}
        mode={mode}
        rangeLabel={rangeLabel}
        prevHref={ROUTES.operationsScheduling(companySlug, { ...schedulingParams, week: iso(prevMonday) })}
        nextHref={ROUTES.operationsScheduling(companySlug, { ...schedulingParams, week: iso(nextMonday) })}
        todayHref={ROUTES.operationsScheduling(companySlug, schedulingParams)}
        calendar={calendarProps}
      />
    </AppShellPage>
  );
}
