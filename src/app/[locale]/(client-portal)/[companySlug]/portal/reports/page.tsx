import { getLocale } from "next-intl/server";
import { requireClientPortalContext } from "@/lib/auth/guards";
import { loadPortalReports } from "@/lib/client-portal/load-portal-data";
import { PortalReportsView } from "@/components/client-portal/portal-reports-view";
import { AppShellPage } from "@/components/design-system/layout";

interface PageProps {
  params: Promise<{ companySlug: string }>;
}

export default async function PortalReportsPage({ params }: PageProps) {
  const { companySlug } = await params;
  await requireClientPortalContext(companySlug);
  const locale = await getLocale();
  const dateLocale = locale === "en" ? "en-US" : "pt-BR";
  const reports = await loadPortalReports(companySlug);

  return (
    <AppShellPage size="fluid">
      <PortalReportsView
        slug={companySlug}
        reports={reports}
        locale={dateLocale}
      />
    </AppShellPage>
  );
}
