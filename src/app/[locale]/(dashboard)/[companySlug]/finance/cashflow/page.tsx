import { getLocale } from "next-intl/server";
import { requireCompanyContext } from "@/lib/auth/guards";
import { getFinanceCashflowAnalytics } from "@/lib/finance/cashflow-analytics-data";
import { CashflowView } from "@/components/features/finance/cashflow-view";
import { AppShellPage } from "@/components/design-system/layout";

interface PageProps {
  params: Promise<{ companySlug: string }>;
}

export default async function FinanceCashflowPage({ params }: PageProps) {
  const { companySlug } = await params;
  await requireCompanyContext({ slug: companySlug, minRole: "supervisor" });
  const locale = await getLocale();
  const dateLocale = locale === "en" ? "en-US" : "pt-BR";
  const data = await getFinanceCashflowAnalytics(companySlug, dateLocale);

  return (
    <AppShellPage size="fluid">
      <CashflowView data={data} locale={dateLocale} />
    </AppShellPage>
  );
}
