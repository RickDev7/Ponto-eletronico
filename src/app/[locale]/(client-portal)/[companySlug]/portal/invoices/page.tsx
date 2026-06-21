import { getLocale } from "next-intl/server";
import { requireClientPortalContext } from "@/lib/auth/guards";
import { loadPortalInvoices } from "@/lib/client-portal/load-portal-data";
import { PortalInvoicesView } from "@/components/client-portal/portal-invoices-view";
import { AppShellPage } from "@/components/design-system/layout";

interface PageProps {
  params: Promise<{ companySlug: string }>;
}

export default async function PortalInvoicesPage({ params }: PageProps) {
  const { companySlug } = await params;
  await requireClientPortalContext(companySlug);
  const locale = await getLocale();
  const dateLocale = locale === "en" ? "en-US" : "pt-BR";
  const invoices = await loadPortalInvoices(companySlug);

  return (
    <AppShellPage size="fluid">
      <PortalInvoicesView
        slug={companySlug}
        invoices={invoices}
        locale={dateLocale}
      />
    </AppShellPage>
  );
}
