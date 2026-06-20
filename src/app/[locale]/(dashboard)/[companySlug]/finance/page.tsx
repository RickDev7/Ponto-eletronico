import { getLocale } from "next-intl/server";
import { requireCompanyContext } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { getFinanceDashboardData } from "@/lib/finance/dashboard-data";
import { FinanceDashboardView } from "@/components/features/finance/dashboard/finance-dashboard-view";
import { AppShellPage } from "@/components/design-system/layout";

interface PageProps {
  params: Promise<{ companySlug: string }>;
}

export default async function FinancePage({ params }: PageProps) {
  const { companySlug } = await params;
  const ctx = await requireCompanyContext({ slug: companySlug, minRole: "supervisor" });
  const supabase = await createClient();
  const locale = await getLocale();
  const dateLocale = locale === "en" ? "en-US" : "pt-BR";

  const [data, { data: company }] = await Promise.all([
    getFinanceDashboardData(companySlug),
    supabase
      .from("companies")
      .select("name, legal_name, tax_id, email, phone, logo_url")
      .eq("id", ctx.company.id)
      .single(),
  ]);

  return (
    <AppShellPage size="fluid">
      <FinanceDashboardView
        slug={companySlug}
        data={data}
        company={
          company ?? {
            name: ctx.company.name,
            legal_name: null,
            tax_id: null,
            email: null,
            phone: null,
            logo_url: null,
          }
        }
        locale={dateLocale}
      />
    </AppShellPage>
  );
}
