import { getLocale } from "next-intl/server";
import { requireClientPortalContext } from "@/lib/auth/guards";
import { loadPortalDocuments } from "@/lib/client-portal/load-portal-data";
import { PortalDocumentsView } from "@/components/client-portal/portal-services-documents-view";
import { AppShellPage } from "@/components/design-system/layout";

interface PageProps {
  params: Promise<{ companySlug: string }>;
}

export default async function PortalDocumentsPage({ params }: PageProps) {
  const { companySlug } = await params;
  await requireClientPortalContext(companySlug);
  const locale = await getLocale();
  const dateLocale = locale === "en" ? "en-US" : "pt-BR";
  const documents = await loadPortalDocuments(companySlug);

  return (
    <AppShellPage size="fluid">
      <PortalDocumentsView
        slug={companySlug}
        documents={documents}
        locale={dateLocale}
      />
    </AppShellPage>
  );
}
