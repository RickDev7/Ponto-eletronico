import { getLocale } from "next-intl/server";
import { requireCompanyContext } from "@/lib/auth/guards";
import { loadAnalyticsCenter } from "@/lib/analytics/load-analytics-center";
import { loadExecutiveDashboardData } from "@/lib/dashboard/load-executive-dashboard-data";
import { ExecutiveAnalyticsView } from "@/components/features/analytics/executive-analytics-view";

interface PageProps {
  params: Promise<{ companySlug: string }>;
}

export default async function AnalyticsExecutivePage({ params }: PageProps) {
  const { companySlug } = await params;
  const ctx = await requireCompanyContext({ slug: companySlug, minRole: "supervisor" });
  const locale = await getLocale();
  const dateLocale = locale === "en" ? "en-US" : "pt-BR";

  const [pillars, executive] = await Promise.all([
    loadAnalyticsCenter(companySlug, dateLocale),
    loadExecutiveDashboardData(ctx.company.id, companySlug, ctx.membership.role, dateLocale),
  ]);

  return (
    <ExecutiveAnalyticsView
      slug={companySlug}
      pillars={pillars}
      executive={executive}
      locale={dateLocale}
    />
  );
}
