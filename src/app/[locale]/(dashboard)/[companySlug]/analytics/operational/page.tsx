import { getLocale } from "next-intl/server";
import { requireCompanyContext } from "@/lib/auth/guards";
import { loadAnalyticsCenter } from "@/lib/analytics/load-analytics-center";
import { loadActivityPageData } from "@/lib/activity/load-activity-page";
import { loadAuditsPageData } from "@/lib/audits/load-audits-page";
import { OperationalAnalyticsView } from "@/components/features/analytics/operational-analytics-view";
import {
  AnalyticsOperationalHubView,
  type OperationalInsightsTab,
} from "@/components/features/analytics/analytics-operational-hub-view";
import { ActivityView } from "@/components/features/activity/activity-view";
import { AuditsView } from "@/components/features/audits/audits-view";
import { AppShellPage } from "@/components/design-system/layout";

interface PageProps {
  params: Promise<{ companySlug: string }>;
  searchParams: Promise<{ tab?: string; days?: string; page?: string }>;
}

export default async function AnalyticsOperationalPage({ params, searchParams }: PageProps) {
  const [{ companySlug }, sp] = await Promise.all([params, searchParams]);
  const ctx = await requireCompanyContext({ slug: companySlug, minRole: "supervisor" });
  const locale = await getLocale();
  const dateLocale = locale === "en" ? "en-US" : "pt-BR";

  const tab: OperationalInsightsTab =
    sp.tab === "activity" ? "activity" : sp.tab === "audits" ? "audits" : "metrics";

  return (
    <AppShellPage size="fluid">
      <AnalyticsOperationalHubView slug={companySlug} tab={tab}>
        {tab === "activity" ? (
          <ActivityTab slug={companySlug} companyId={ctx.company.id} page={sp.page} />
        ) : tab === "audits" ? (
          <AuditsTab slug={companySlug} companyId={ctx.company.id} days={sp.days} />
        ) : (
          <MetricsTab slug={companySlug} dateLocale={dateLocale} />
        )}
      </AnalyticsOperationalHubView>
    </AppShellPage>
  );
}

async function MetricsTab({ slug, dateLocale }: { slug: string; dateLocale: string }) {
  const data = await loadAnalyticsCenter(slug, dateLocale);
  return <OperationalAnalyticsView slug={slug} data={data} locale={dateLocale} embedded />;
}

async function ActivityTab({
  slug,
  companyId,
  page,
}: {
  slug: string;
  companyId: string;
  page?: string;
}) {
  const currentPage = Math.max(1, parseInt(page ?? "1", 10));
  const data = await loadActivityPageData(slug, companyId, currentPage);
  return (
    <ActivityView
      slug={slug}
      items={data.items}
      totalCount={data.totalCount}
      currentPage={data.currentPage}
      totalPages={data.totalPages}
      alerts={data.alerts}
      health={data.health}
      embedded
    />
  );
}

async function AuditsTab({
  slug,
  companyId,
  days: daysParam,
}: {
  slug: string;
  companyId: string;
  days?: string;
}) {
  const days = [7, 14, 30].includes(Number(daysParam)) ? Number(daysParam) : 14;
  const data = await loadAuditsPageData(companyId, days);
  return (
    <AuditsView slug={slug} days={days} rows={data.rows} metrics={data.metrics} embedded />
  );
}
