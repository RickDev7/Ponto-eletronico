import { AppShellPage } from "@/components/design-system/app-shell";
import { SkeletonOperationsPage } from "@/components/shared";

export default function TasksLoading() {
  return (
    <AppShellPage size="fluid">
      <SkeletonOperationsPage showFilters tableRows={14} tableColumns={7} />
    </AppShellPage>
  );
}
