import { getLocale } from "next-intl/server";
import { requireCompanyContext } from "@/lib/auth/guards";
import {
  WorkforceTimeBankView,
  type TimeBankTab,
} from "@/components/features/workforce/workforce-time-bank-view";
import { loadTimeAccountSummaries, loadTimesheetEntries } from "@/lib/workforce/load-workforce-data";
import { loadTimeTrackingReport } from "@/lib/time-tracking/load-time-tracking-data";
import type { TimeReportGranularity } from "@/lib/time-tracking/compute-time-summary";
import { AppShellPage } from "@/components/design-system/layout";

interface PageProps {
  params: Promise<{ companySlug: string }>;
  searchParams: Promise<{ tab?: string; granularity?: string; date?: string }>;
}

export default async function WorkforceTimeAccountPage({ params, searchParams }: PageProps) {
  const [{ companySlug }, sp] = await Promise.all([params, searchParams]);
  const ctx = await requireCompanyContext({ slug: companySlug, minRole: "supervisor" });
  const locale = await getLocale();
  const dateLocale = locale === "en" ? "en-US" : "pt-BR";
  const reportLocale = locale === "en" ? "en" : "pt";

  const tab: TimeBankTab =
    sp.tab === "tracking" ? "tracking" : sp.tab === "timesheets" ? "timesheets" : "account";

  const summaries = await loadTimeAccountSummaries(ctx.company.id);

  let tracking: {
    locale: string;
    report: Awaited<ReturnType<typeof loadTimeTrackingReport>>;
    anchorDate: string;
  } | undefined;

  if (tab === "tracking") {
    const granularity = (["daily", "weekly", "monthly"].includes(sp.granularity ?? "")
      ? sp.granularity
      : "weekly") as TimeReportGranularity;
    const anchorDate = sp.date ?? new Date().toISOString().slice(0, 10);
    const report = await loadTimeTrackingReport(
      ctx.company.id,
      granularity,
      anchorDate,
      reportLocale,
    );
    tracking = { locale: reportLocale, report, anchorDate };
  }

  let timesheets: {
    entries: Awaited<ReturnType<typeof loadTimesheetEntries>>;
    locale: string;
  } | undefined;

  if (tab === "timesheets") {
    const monthStart = new Date();
    monthStart.setDate(1);
    const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
    const entries = await loadTimesheetEntries(
      ctx.company.id,
      monthStart.toISOString().slice(0, 10),
      monthEnd.toISOString().slice(0, 10),
    );
    timesheets = { entries, locale: dateLocale };
  }

  return (
    <AppShellPage size="fluid">
      <WorkforceTimeBankView
        slug={companySlug}
        tab={tab}
        summaries={summaries}
        tracking={tracking}
        timesheets={timesheets}
      />
    </AppShellPage>
  );
}
