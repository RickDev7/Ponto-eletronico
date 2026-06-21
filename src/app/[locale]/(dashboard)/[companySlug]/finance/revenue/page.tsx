import { getLocale } from "next-intl/server";
import { requireCompanyContext } from "@/lib/auth/guards";
import { getFinanceRevenueData } from "@/lib/finance/revenue-data";
import { RevenueView } from "@/components/features/finance/revenue-view";
import { AppShellPage } from "@/components/design-system/layout";

interface PageProps {
  params: Promise<{ companySlug: string }>;
}

export default async function FinanceRevenuePage({ params }: PageProps) {
  const { companySlug } = await params;
  await requireCompanyContext({ slug: companySlug, minRole: "supervisor" });
  const locale = await getLocale();
  const dateLocale = locale === "en" ? "en-US" : "pt-BR";
  const data = await getFinanceRevenueData(companySlug, dateLocale);

  return (
    <AppShellPage size="fluid">
      <RevenueView data={data} locale={dateLocale} />
    </AppShellPage>
  );
}
