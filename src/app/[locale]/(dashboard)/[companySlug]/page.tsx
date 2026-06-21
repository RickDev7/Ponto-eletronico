import { requireCompanyContext } from "@/lib/auth/guards";
import { getLocale } from "next-intl/server";
import { LOCALE_DATE_MAP } from "@/lib/i18n/metadata";
import { loadExecutiveDashboardData } from "@/lib/dashboard/load-executive-dashboard-data";
import { CommandCenterView } from "@/components/features/dashboard/command-center-view";

interface DashboardPageProps {
  params: Promise<{ companySlug: string }>;
}

export default async function DashboardPage({ params }: DashboardPageProps) {
  const { companySlug } = await params;
  const ctx = await requireCompanyContext({ slug: companySlug });
  const locale = await getLocale();
  const dateLocale = LOCALE_DATE_MAP[locale] ?? "en-US";

  const data = await loadExecutiveDashboardData(
    ctx.company.id,
    companySlug,
    ctx.membership.role,
    dateLocale,
  );

  return (
    <CommandCenterView slug={companySlug} data={data} locale={dateLocale} />
  );
}
