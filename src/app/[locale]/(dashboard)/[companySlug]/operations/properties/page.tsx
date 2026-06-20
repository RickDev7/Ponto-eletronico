import { requireCompanyContext } from "@/lib/auth/guards";
import { OperationsPropertiesView } from "@/components/features/operations/operations-properties-view";
import { loadProperties } from "@/lib/operations/load-operations-data";
import { AppShellPage } from "@/components/design-system/layout";

interface PageProps {
  params: Promise<{ companySlug: string }>;
}

export default async function OperationsPropertiesPage({ params }: PageProps) {
  const { companySlug } = await params;
  const ctx = await requireCompanyContext({ slug: companySlug, minRole: "supervisor" });
  const properties = await loadProperties(ctx.company.id);

  return (
    <AppShellPage size="fluid">
      <OperationsPropertiesView slug={companySlug} properties={properties} />
    </AppShellPage>
  );
}
