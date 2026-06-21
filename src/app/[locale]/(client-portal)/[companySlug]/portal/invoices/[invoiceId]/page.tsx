import { notFound } from "next/navigation";
import { getLocale } from "next-intl/server";
import { requireClientPortalContext } from "@/lib/auth/guards";
import { loadPortalInvoiceDetail } from "@/lib/client-portal/load-portal-data";
import { PortalInvoiceDetailView } from "@/components/client-portal/portal-invoice-detail-view";
import { AppShellPage } from "@/components/design-system/layout";

interface PageProps {
  params: Promise<{ companySlug: string; invoiceId: string }>;
}

export default async function PortalInvoiceDetailPage({ params }: PageProps) {
  const { companySlug, invoiceId } = await params;
  await requireClientPortalContext(companySlug);
  const locale = await getLocale();
  const dateLocale = locale === "en" ? "en-US" : "pt-BR";
  const detail = await loadPortalInvoiceDetail(companySlug, invoiceId);

  if (!detail) notFound();

  return (
    <AppShellPage size="fluid">
      <PortalInvoiceDetailView
        slug={companySlug}
        invoice={detail.invoice as Record<string, unknown>}
        company={detail.company}
        locale={dateLocale}
      />
    </AppShellPage>
  );
}
