import { SkeletonKpiGrid, SkeletonOperationsPage } from "@/components/shared";
import { AppShellPage } from "@/components/design-system/layout";

export default function ContractsLoading() {
  return (
    <AppShellPage size="fluid">
      <SkeletonKpiGrid count={6} className="mb-4" />
      <SkeletonOperationsPage showFilters tableRows={10} tableColumns={10} />
    </AppShellPage>
  );
}
