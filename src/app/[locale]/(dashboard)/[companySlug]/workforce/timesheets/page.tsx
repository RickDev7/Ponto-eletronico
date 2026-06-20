import { getLocale } from "next-intl/server";
import { requireCompanyContext } from "@/lib/auth/guards";
import { WorkforceTimesheetsView } from "@/components/features/workforce/workforce-timesheets-view";
import { loadTimesheetEntries } from "@/lib/workforce/load-workforce-data";
import { AppShellPage } from "@/components/design-system/layout";

interface PageProps {
  params: Promise<{ companySlug: string }>;
}

export default async function WorkforceTimesheetsPage({ params }: PageProps) {
  const { companySlug } = await params;
  const ctx = await requireCompanyContext({ slug: companySlug, minRole: "supervisor" });
  const locale = await getLocale();
  const dateLocale = locale === "en" ? "en-US" : "pt-BR";

  const monthStart = new Date();
  monthStart.setDate(1);
  const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);

  const entries = await loadTimesheetEntries(
    ctx.company.id,
    monthStart.toISOString().slice(0, 10),
    monthEnd.toISOString().slice(0, 10),
  );

  return (
    <AppShellPage size="fluid">
      <WorkforceTimesheetsView slug={companySlug} entries={entries} locale={dateLocale} />
    </AppShellPage>
  );
}
