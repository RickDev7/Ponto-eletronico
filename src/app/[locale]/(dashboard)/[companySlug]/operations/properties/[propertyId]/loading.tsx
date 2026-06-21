import { SkeletonKpiGrid, SkeletonOperationsPage } from "@/components/shared";
import { AppShellPage } from "@/components/design-system/layout";

export default function PropertyDetailLoading() {
  return (
    <AppShellPage size="fluid">
      <SkeletonKpiGrid count={6} className="mb-4" />
      <SkeletonOperationsPage showFilters tableRows={6} tableColumns={4} />
    </AppShellPage>
  );
}
