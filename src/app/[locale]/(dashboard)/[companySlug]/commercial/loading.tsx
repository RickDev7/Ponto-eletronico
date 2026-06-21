import { SkeletonKpiGrid, SkeletonOperationsPage } from "@/components/shared";
import { AppShellPage } from "@/components/design-system/layout";

export default function CommercialLoading() {
  return (
    <AppShellPage size="fluid">
      <SkeletonKpiGrid count={6} className="mb-4" />
      <SkeletonOperationsPage showFilters tableRows={8} tableColumns={5} />
    </AppShellPage>
  );
}
