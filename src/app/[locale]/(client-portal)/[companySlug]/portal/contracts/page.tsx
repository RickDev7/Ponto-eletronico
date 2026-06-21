import { getLocale } from "next-intl/server";
import { requireClientPortalContext } from "@/lib/auth/guards";
import { loadPortalContracts } from "@/lib/client-portal/load-portal-data";
import { PortalContractsView } from "@/components/client-portal/portal-contracts-view";
import { AppShellPage } from "@/components/design-system/layout";

interface PageProps {
  params: Promise<{ companySlug: string }>;
}

export default async function PortalContractsPage({ params }: PageProps) {
  const { companySlug } = await params;
  await requireClientPortalContext(companySlug);
  const locale = await getLocale();
  const dateLocale = locale === "en" ? "en-US" : "pt-BR";
  const contracts = await loadPortalContracts(companySlug);

  return (
    <AppShellPage size="fluid">
      <PortalContractsView contracts={contracts} locale={dateLocale} />
    </AppShellPage>
  );
}
