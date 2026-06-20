import { getLocale } from "next-intl/server";
import { requireCompanyContext } from "@/lib/auth/guards";
import { can } from "@/config/permissions";
import { ROUTES } from "@/config/constants";
import { PersonnelPlanningView } from "@/components/features/workforce/personnel-planning-view";
import { loadPlanningPageData } from "@/lib/workforce/load-workforce-data";
import { loadPlanningProfitability } from "@/lib/workforce/load-planning-profitability";
import { AppShellPage } from "@/components/design-system/layout";
import { LOCALE_DATE_MAP } from "@/lib/i18n/metadata";

interface PageProps {
  params: Promise<{ companySlug: string }>;
  searchParams: Promise<{ view?: string; week?: string }>;
}

function weekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day + (day === 0 ? -6 : 1));
  d.setHours(0, 0, 0, 0);
  return d;
}

function iso(date: Date) {
  return date.toISOString().slice(0, 10);
}

function dateRange(view: "day" | "week" | "month", baseDate: Date) {
  if (view === "day") {
    const d = iso(baseDate);
    return { from: d, to: d, dates: [d] };
  }
  if (view === "month") {
    const first = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
    const last = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0);
    const dates: string[] = [];
    for (let d = new Date(first); d <= last; d.setDate(d.getDate() + 1)) {
      dates.push(iso(new Date(d)));
    }
    return { from: iso(first), to: iso(last), dates };
  }
  const monday = weekStart(baseDate);
  const dates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return iso(d);
  });
  return { from: dates[0], to: dates[6], dates };
}

export default async function PersonnelPlanningPage({ params, searchParams }: PageProps) {
  const [{ companySlug }, sp] = await Promise.all([params, searchParams]);
  const ctx = await requireCompanyContext({ slug: companySlug, minRole: "supervisor" });
  const locale = await getLocale();
  const dateLocale = LOCALE_DATE_MAP[locale] ?? "en-US";

  const view = (sp.view === "day" || sp.view === "month" ? sp.view : "week") as "day" | "week" | "month";
  const baseDate = sp.week ? new Date(sp.week + "T00:00:00") : new Date();
  const { from, to, dates } = dateRange(view, baseDate);

  const data = await loadPlanningPageData(ctx.company.id, from, to);
  const profitability =
    view === "month"
      ? await loadPlanningProfitability(ctx.company.id, from, to, data.shifts, data.employees)
      : null;

  const monthStart = `${baseDate.getFullYear()}-${String(baseDate.getMonth() + 1).padStart(2, "0")}-01`;

  let rangeLabel: string;
  let prevDate: Date;
  let nextDate: Date;
  let weekStartIso: string;

  if (view === "day") {
    rangeLabel = baseDate.toLocaleDateString(dateLocale, {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    prevDate = new Date(baseDate);
    prevDate.setDate(baseDate.getDate() - 1);
    nextDate = new Date(baseDate);
    nextDate.setDate(baseDate.getDate() + 1);
    weekStartIso = iso(weekStart(baseDate));
  } else if (view === "month") {
    const first = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
    rangeLabel = first.toLocaleDateString(dateLocale, { month: "long", year: "numeric" });
    prevDate = new Date(first);
    prevDate.setMonth(first.getMonth() - 1);
    nextDate = new Date(first);
    nextDate.setMonth(first.getMonth() + 1);
    weekStartIso = iso(weekStart(baseDate));
  } else {
    const monday = weekStart(baseDate);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    rangeLabel = `${monday.toLocaleDateString(dateLocale, { day: "2-digit", month: "short" })} – ${sunday.toLocaleDateString(dateLocale, { day: "2-digit", month: "short", year: "numeric" })}`;
    prevDate = new Date(monday);
    prevDate.setDate(monday.getDate() - 7);
    nextDate = new Date(monday);
    nextDate.setDate(monday.getDate() + 7);
    weekStartIso = iso(monday);
  }

  const routeParams = { view, week: iso(prevDate) };
  const routeParamsNext = { view, week: iso(nextDate) };

  return (
    <AppShellPage size="fluid">
      <PersonnelPlanningView
        slug={companySlug}
        locale={locale}
        view={view}
        rangeLabel={rangeLabel}
        dates={dates}
        weekStart={weekStartIso}
        monthStart={monthStart}
        prevHref={ROUTES.workforcePlanning(companySlug, routeParams)}
        nextHref={ROUTES.workforcePlanning(companySlug, routeParamsNext)}
        todayHref={ROUTES.workforcePlanning(companySlug, { view })}
        canWrite={can(ctx.membership.role, "tasks:write")}
        employees={data.employees}
        vacations={data.vacations}
        absences={data.absences}
        shifts={data.shifts}
        summaries={data.summaries}
        todayMinutes={data.todayMinutes}
        unassignedTasks={data.unassignedTasks}
        profitability={profitability}
      />
    </AppShellPage>
  );
}
