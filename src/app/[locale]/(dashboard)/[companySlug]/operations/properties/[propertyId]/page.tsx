import { getLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { requireCompanyContext } from "@/lib/auth/guards";
import { PropertyDetailView } from "@/components/features/operations/property-detail-view";
import { loadPropertyById } from "@/lib/operations/load-operations-data";
import { AppShellPage } from "@/components/design-system/layout";

interface PageProps {
  params: Promise<{ companySlug: string; propertyId: string }>;
}

export default async function OperationsPropertyDetailPage({ params }: PageProps) {
  const { companySlug, propertyId } = await params;
  const ctx = await requireCompanyContext({ slug: companySlug, minRole: "supervisor" });
  const locale = await getLocale();
  const dateLocale = locale === "en" ? "en-US" : "pt-BR";

  const { property, tasks, contracts, upcoming } = await loadPropertyById(
    ctx.company.id,
    propertyId,
  );

  if (!property) notFound();

  return (
    <AppShellPage size="fluid">
      <PropertyDetailView
        slug={companySlug}
        property={property}
        tasks={tasks}
        contracts={contracts}
        upcoming={upcoming}
        locale={dateLocale}
      />
    </AppShellPage>
  );
}
