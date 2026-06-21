import { getLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { requireCompanyContext } from "@/lib/auth/guards";
import { can } from "@/config/permissions";
import { LOCALE_DATE_MAP } from "@/lib/i18n/metadata";
import { loadProperty360Data } from "@/lib/properties/load-property-360-data";
import { Property360View } from "@/components/features/properties/property-360-view";
import { AppShellPage } from "@/components/design-system/layout";

interface PageProps {
  params: Promise<{ companySlug: string; propertyId: string }>;
}

export default async function OperationsPropertyDetailPage({ params }: PageProps) {
  const { companySlug, propertyId } = await params;
  const ctx = await requireCompanyContext({ slug: companySlug, minRole: "supervisor" });
  const locale = await getLocale();
  const dateLocale = LOCALE_DATE_MAP[locale] ?? "en-US";

  const data = await loadProperty360Data(ctx.company.id, propertyId);
  if (!data) notFound();

  return (
    <AppShellPage size="fluid">
      <Property360View
        slug={companySlug}
        data={data}
        locale={dateLocale}
        canWrite={can(ctx.membership.role, "addresses:write")}
      />
    </AppShellPage>
  );
}
