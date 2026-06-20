import { getLocale } from "next-intl/server";
import { requireCompanyContext } from "@/lib/auth/guards";
import { getFinanceCostsData } from "@/lib/finance/costs-data";
import { CostsView } from "@/components/features/finance/costs-view";
import { AppShellPage } from "@/components/design-system/layout";

interface PageProps {
  params: Promise<{ companySlug: string }>;
}

export default async function FinanceCostsPage({ params }: PageProps) {
  const { companySlug } = await params;
  await requireCompanyContext({ slug: companySlug, minRole: "supervisor" });
  const locale = await getLocale();
  const dateLocale = locale === "en" ? "en-US" : "pt-BR";
  const data = await getFinanceCostsData(companySlug, dateLocale);

  return (
    <AppShellPage size="fluid">
      <CostsView data={data} locale={dateLocale} />
    </AppShellPage>
  );
}
