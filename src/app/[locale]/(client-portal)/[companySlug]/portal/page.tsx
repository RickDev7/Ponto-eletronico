import { getLocale } from "next-intl/server";
import { requireClientPortalContext } from "@/lib/auth/guards";
import { loadPortalOverview } from "@/lib/client-portal/load-portal-data";
import { PortalOverviewView } from "@/components/client-portal/portal-overview-view";
import { AppShellPage } from "@/components/design-system/layout";

interface PageProps {
  params: Promise<{ companySlug: string }>;
}

export default async function ClientPortalHomePage({ params }: PageProps) {
  const { companySlug } = await params;
  const ctx = await requireClientPortalContext(companySlug);
  const locale = await getLocale();
  const dateLocale = locale === "en" ? "en-US" : "pt-BR";
  const data = await loadPortalOverview(companySlug);

  return (
    <AppShellPage size="fluid">
      <PortalOverviewView
        slug={companySlug}
        clientName={ctx.client.name}
        data={
          data ?? {
            activeContracts: 0,
            openInvoices: 0,
            overdueInvoices: 0,
            properties: 0,
            recentInvoices: [],
            upcomingServices: [],
          }
        }
        locale={dateLocale}
      />
    </AppShellPage>
  );
}
