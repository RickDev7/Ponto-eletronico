import { getLocale } from "next-intl/server";
import { requireCompanyContext } from "@/lib/auth/guards";
import { loadAnalyticsCenter } from "@/lib/analytics/load-analytics-center";
import { loadFinanceAnalytics } from "@/lib/finance/load-finance-analytics";
import { FinancialAnalyticsView } from "@/components/features/analytics/financial-analytics-view";

interface PageProps {
  params: Promise<{ companySlug: string }>;
}

export default async function AnalyticsFinancialPage({ params }: PageProps) {
  const { companySlug } = await params;
  await requireCompanyContext({ slug: companySlug, minRole: "supervisor" });
  const locale = await getLocale();
  const dateLocale = locale === "en" ? "en-US" : "pt-BR";

  const [data, finance] = await Promise.all([
    loadAnalyticsCenter(companySlug, dateLocale),
    loadFinanceAnalytics(companySlug, dateLocale),
  ]);

  const financeMonthly = finance.monthly.slice(-6).map((m) => ({
    label: m.label,
    receivedCents: m.receivedCents,
    costCents: m.costCents,
    profitCents: m.profitCents,
  }));

  return (
    <FinancialAnalyticsView
      slug={companySlug}
      data={data}
      financeMonthly={financeMonthly}
      locale={dateLocale}
    />
  );
}
