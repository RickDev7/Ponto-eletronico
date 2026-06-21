import { getLocale } from "next-intl/server";
import { requireClientPortalContext } from "@/lib/auth/guards";
import { loadPortalServices } from "@/lib/client-portal/load-portal-data";
import { PortalServicesView } from "@/components/client-portal/portal-services-documents-view";
import { AppShellPage } from "@/components/design-system/layout";

interface PageProps {
  params: Promise<{ companySlug: string }>;
}

export default async function PortalServicesPage({ params }: PageProps) {
  const { companySlug } = await params;
  await requireClientPortalContext(companySlug);
  const locale = await getLocale();
  const dateLocale = locale === "en" ? "en-US" : "pt-BR";
  const { addresses, contracts, recentTasks } = await loadPortalServices(companySlug);

  return (
    <AppShellPage size="fluid">
      <PortalServicesView
        addresses={addresses}
        contracts={contracts}
        recentTasks={recentTasks}
        locale={dateLocale}
      />
    </AppShellPage>
  );
}
