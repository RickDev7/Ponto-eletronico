import { getLocale } from "next-intl/server";
import { requireCompanyContext } from "@/lib/auth/guards";
import { getFinanceProfitabilityData } from "@/lib/finance/profitability-data";
import { ProfitabilityView } from "@/components/features/finance/profitability-view";
import { AppShellPage } from "@/components/design-system/layout";

interface PageProps {
  params: Promise<{ companySlug: string }>;
}

export default async function FinanceProfitabilityPage({ params }: PageProps) {
  const { companySlug } = await params;
  await requireCompanyContext({ slug: companySlug, minRole: "supervisor" });
  const locale = await getLocale();
  const dateLocale = locale === "en" ? "en-US" : "pt-BR";
  const data = await getFinanceProfitabilityData(companySlug, dateLocale);

  return (
    <AppShellPage size="fluid">
      <ProfitabilityView data={data} locale={dateLocale} />
    </AppShellPage>
  );
}
