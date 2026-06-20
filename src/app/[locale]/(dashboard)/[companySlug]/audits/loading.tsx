import { AppShellPage } from "@/components/design-system/layout/app-shell-content";
import { SkeletonOperationsPage } from "@/components/shared/skeleton";

export default function AuditsLoading() {
  return (
    <AppShellPage size="fluid">
      <SkeletonOperationsPage showFilters tableRows={10} tableColumns={7} />
    </AppShellPage>
  );
}
