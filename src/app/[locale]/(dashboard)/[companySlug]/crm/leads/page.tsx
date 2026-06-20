import { getLocale } from "next-intl/server";
import { requireCompanyContext } from "@/lib/auth/guards";
import { can } from "@/config/permissions";
import { LeadsView } from "@/components/features/crm/leads-view";
import { loadCrmMembers, loadLeads } from "@/lib/crm/load-crm-data";
import { AppShellPage } from "@/components/design-system/layout";

interface PageProps {
  params: Promise<{ companySlug: string }>;
}

export default async function CrmLeadsPage({ params }: PageProps) {
  const { companySlug } = await params;
  const ctx = await requireCompanyContext({ slug: companySlug, minRole: "supervisor" });
  const locale = await getLocale();
  const dateLocale = locale === "en" ? "en-US" : "pt-BR";
  const [leads, members] = await Promise.all([
    loadLeads(ctx.company.id),
    loadCrmMembers(ctx.company.id),
  ]);

  return (
    <AppShellPage size="fluid">
      <LeadsView
        slug={companySlug}
        leads={leads}
        members={members}
        locale={dateLocale}
        canWrite={can(ctx.membership.role, "crm:write")}
      />
    </AppShellPage>
  );
}
