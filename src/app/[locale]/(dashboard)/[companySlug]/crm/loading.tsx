import { SkeletonKpiGrid, SkeletonOperationsPage } from "@/components/shared";
import { AppShellPage } from "@/components/design-system/layout";

export default function CrmLoading() {
  return (
    <AppShellPage size="fluid">
      <SkeletonKpiGrid count={7} className="mb-4" />
      <SkeletonOperationsPage showFilters tableRows={8} tableColumns={7} />
    </AppShellPage>
  );
}
