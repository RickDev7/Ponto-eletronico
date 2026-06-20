import { getLocale } from "next-intl/server";
import { requireCompanyContext } from "@/lib/auth/guards";
import { can } from "@/config/permissions";
import { PipelineView } from "@/components/features/crm/pipeline-view";
import { loadLeads } from "@/lib/crm/load-crm-data";
import { AppShellPage } from "@/components/design-system/layout";

interface PageProps {
  params: Promise<{ companySlug: string }>;
}

export default async function CrmPipelinePage({ params }: PageProps) {
  const { companySlug } = await params;
  const ctx = await requireCompanyContext({ slug: companySlug, minRole: "supervisor" });
  const locale = await getLocale();
  const dateLocale = locale === "en" ? "en-US" : "pt-BR";
  const leads = await loadLeads(ctx.company.id);

  return (
    <AppShellPage size="fluid">
      <PipelineView
        slug={companySlug}
        leads={leads}
        locale={dateLocale}
        canWrite={can(ctx.membership.role, "crm:write")}
      />
    </AppShellPage>
  );
}
