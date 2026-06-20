import { AppShellPage } from "@/components/design-system/layout/app-shell-content";
import { SkeletonOperationsPage } from "@/components/shared/skeleton";

export default function ReportsLoading() {
  return (
    <AppShellPage size="fluid">
      <SkeletonOperationsPage showFilters tableRows={8} tableColumns={4} />
    </AppShellPage>
  );
}
