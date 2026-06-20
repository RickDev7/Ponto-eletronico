import { getLocale } from "next-intl/server";
import { requireCompanyContext } from "@/lib/auth/guards";
import { ROUTES } from "@/config/constants";
import { OperationsSchedulingView } from "@/components/features/operations/operations-scheduling-view";
import { loadSchedulingTasks } from "@/lib/operations/load-operations-data";
import { AppShellPage } from "@/components/design-system/layout";
import { LOCALE_DATE_MAP } from "@/lib/i18n/metadata";

interface PageProps {
  params: Promise<{ companySlug: string }>;
  searchParams: Promise<{ view?: string; week?: string }>;
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

  const view = (sp.view === "day" || sp.view === "month" ? sp.view : "week") as "day" | "week" | "month";
  const baseDate = sp.week ? new Date(sp.week + "T00:00:00") : new Date();

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

  const tasks = await loadSchedulingTasks(ctx.company.id, from, to);

  return (
    <AppShellPage size="fluid">
      <OperationsSchedulingView
        slug={companySlug}
        tasks={tasks}
        view={view}
        rangeLabel={rangeLabel}
        prevHref={ROUTES.operationsScheduling(companySlug, { view, week: iso(prevMonday) })}
        nextHref={ROUTES.operationsScheduling(companySlug, { view, week: iso(nextMonday) })}
        todayHref={ROUTES.operationsScheduling(companySlug, { view })}
      />
    </AppShellPage>
  );
}
