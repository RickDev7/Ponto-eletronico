import { getLocale } from "next-intl/server";
import { requireCompanyContext } from "@/lib/auth/guards";
import { CompaniesView } from "@/components/features/crm/companies-view";
import { loadLeads } from "@/lib/crm/load-crm-data";
import { aggregateLeadCompanies } from "@/lib/crm/leads-data";
import { AppShellPage } from "@/components/design-system/layout";

interface PageProps {
  params: Promise<{ companySlug: string }>;
}

export default async function CrmCompaniesPage({ params }: PageProps) {
  const { companySlug } = await params;
  const ctx = await requireCompanyContext({ slug: companySlug, minRole: "supervisor" });
  const locale = await getLocale();
  const dateLocale = locale === "en" ? "en-US" : "pt-BR";
  const leads = await loadLeads(ctx.company.id);
  const companies = aggregateLeadCompanies(leads);

  return (
    <AppShellPage size="fluid">
      <CompaniesView slug={companySlug} companies={companies} locale={dateLocale} />
    </AppShellPage>
  );
}
