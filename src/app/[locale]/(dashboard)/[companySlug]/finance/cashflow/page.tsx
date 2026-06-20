import { getLocale } from "next-intl/server";
import { requireCompanyContext } from "@/lib/auth/guards";
import { getCashflowData } from "@/actions/finance/actions";
import { CashflowView } from "@/components/features/finance/cashflow-view";
import { AppShellPage } from "@/components/design-system/layout";

interface PageProps {
  params: Promise<{ companySlug: string }>;
}

export default async function FinanceCashflowPage({ params }: PageProps) {
  const { companySlug } = await params;
  await requireCompanyContext({ slug: companySlug, minRole: "supervisor" });
  const [months, locale] = await Promise.all([
    getCashflowData(companySlug),
    getLocale(),
  ]);
  const dateLocale = locale === "en" ? "en-US" : "pt-BR";

  return (
    <AppShellPage size="fluid">
      <CashflowView months={months} locale={dateLocale} />
    </AppShellPage>
  );
}
