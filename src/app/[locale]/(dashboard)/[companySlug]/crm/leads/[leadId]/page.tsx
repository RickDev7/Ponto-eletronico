import { getLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { requireCompanyContext } from "@/lib/auth/guards";
import { can } from "@/config/permissions";
import { LeadDetailView } from "@/components/features/crm/lead-detail-view";
import { loadLeadById } from "@/lib/crm/load-crm-data";
import { AppShellPage } from "@/components/design-system/layout";

interface PageProps {
  params: Promise<{ companySlug: string; leadId: string }>;
}

export default async function CrmLeadDetailPage({ params }: PageProps) {
  const { companySlug, leadId } = await params;
  const ctx = await requireCompanyContext({ slug: companySlug, minRole: "supervisor" });
  const locale = await getLocale();
  const dateLocale = locale === "en" ? "en-US" : "pt-BR";
  const { lead, events } = await loadLeadById(ctx.company.id, leadId);

  if (!lead) notFound();

  return (
    <AppShellPage size="fluid">
      <LeadDetailView
        slug={companySlug}
        lead={lead}
        events={events}
        locale={dateLocale}
        canWrite={can(ctx.membership.role, "crm:write")}
      />
    </AppShellPage>
  );
}
