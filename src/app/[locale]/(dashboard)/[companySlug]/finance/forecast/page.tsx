import { getLocale } from "next-intl/server";
import { requireCompanyContext } from "@/lib/auth/guards";
import { getFinanceForecastData } from "@/lib/finance/forecast-data";
import { ForecastView } from "@/components/features/finance/forecast-view";
import { AppShellPage } from "@/components/design-system/layout";

interface PageProps {
  params: Promise<{ companySlug: string }>;
}

export default async function FinanceForecastPage({ params }: PageProps) {
  const { companySlug } = await params;
  await requireCompanyContext({ slug: companySlug, minRole: "supervisor" });
  const locale = await getLocale();
  const dateLocale = locale === "en" ? "en-US" : "pt-BR";
  const data = await getFinanceForecastData(companySlug, dateLocale);

  return (
    <AppShellPage size="fluid">
      <ForecastView data={data} locale={dateLocale} />
    </AppShellPage>
  );
}
