import { getLocale } from "next-intl/server";
import { requireCompanyContext } from "@/lib/auth/guards";
import { CommercialPipelineView } from "@/components/features/commercial/commercial-pipeline-view";
import { loadCommercialDeals, groupDealsByStage } from "@/lib/commercial/load-commercial-data";
import { AppShellPage } from "@/components/design-system/layout";

interface PageProps {
  params: Promise<{ companySlug: string }>;
}

export default async function CommercialPipelinePage({ params }: PageProps) {
  const { companySlug } = await params;
  const ctx = await requireCompanyContext({
    slug: companySlug,
    minRole: "supervisor",
    permission: "commercial:read",
  });
  const locale = await getLocale();
  const dateLocale = locale === "en" ? "en-US" : "pt-BR";
  const deals = await loadCommercialDeals(ctx.company.id);

  return (
    <AppShellPage size="fluid">
      <CommercialPipelineView
        slug={companySlug}
        deals={deals}
        byStage={groupDealsByStage(deals)}
        locale={dateLocale}
      />
    </AppShellPage>
  );
}
