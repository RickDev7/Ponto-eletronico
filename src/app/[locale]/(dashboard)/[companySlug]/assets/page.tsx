import { requireCompanyContext } from "@/lib/auth/guards";
import { loadAssetsHubData } from "@/lib/assets/load-assets-hub-data";
import { AssetsHubView } from "@/components/features/assets/assets-hub-view";
import { AppShellPage } from "@/components/design-system/layout";

interface PageProps {
  params: Promise<{ companySlug: string }>;
}

export default async function AssetsHubPage({ params }: PageProps) {
  const { companySlug } = await params;
  const ctx = await requireCompanyContext({ slug: companySlug, minRole: "supervisor" });
  const data = await loadAssetsHubData(ctx.company.id);

  return (
    <AppShellPage size="fluid">
      <AssetsHubView slug={companySlug} data={data} />
    </AppShellPage>
  );
}
