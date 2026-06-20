import { getLocale } from "next-intl/server";
import { requireCompanyContext } from "@/lib/auth/guards";
import { can } from "@/config/permissions";
import { CrmDashboardView } from "@/components/features/crm/crm-dashboard-view";
import { loadLeads, loadRecentLeadEvents } from "@/lib/crm/load-crm-data";
import { AppShellPage } from "@/components/design-system/layout";

interface PageProps {
  params: Promise<{ companySlug: string }>;
}

export default async function CrmDashboardPage({ params }: PageProps) {
  const { companySlug } = await params;
  const ctx = await requireCompanyContext({ slug: companySlug, minRole: "supervisor" });
  const locale = await getLocale();
  const dateLocale = locale === "en" ? "en-US" : "pt-BR";
  const [leads, activities] = await Promise.all([
    loadLeads(ctx.company.id),
    loadRecentLeadEvents(ctx.company.id),
  ]);

  return (
    <AppShellPage size="fluid">
      <CrmDashboardView
        slug={companySlug}
        leads={leads}
        activities={activities}
        locale={dateLocale}
        canWrite={can(ctx.membership.role, "crm:write")}
      />
    </AppShellPage>
  );
}
