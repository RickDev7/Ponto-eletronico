import { getLocale } from "next-intl/server";
import { requireCompanyContext } from "@/lib/auth/guards";
import { can } from "@/config/permissions";
import { CommercialHubView } from "@/components/features/commercial/commercial-hub-view";
import { loadCommercialHubData } from "@/lib/commercial/load-commercial-data";
import { AppShellPage } from "@/components/design-system/layout";

interface PageProps {
  params: Promise<{ companySlug: string }>;
}

export default async function CommercialHubPage({ params }: PageProps) {
  const { companySlug } = await params;
  const ctx = await requireCompanyContext({
    slug: companySlug,
    minRole: "supervisor",
    permission: "commercial:read",
  });
  const locale = await getLocale();
  const dateLocale = locale === "en" ? "en-US" : "pt-BR";
  const data = await loadCommercialHubData(ctx.company.id, companySlug);

  return (
    <AppShellPage size="fluid">
      <CommercialHubView
        slug={companySlug}
        deals={data.deals}
        kpis={data.kpis}
        byStage={data.byStage}
        activity={data.activity}
        locale={dateLocale}
        canWrite={can(ctx.membership.role, "commercial:write")}
      />
    </AppShellPage>
  );
}
