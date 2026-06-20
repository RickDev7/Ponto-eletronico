import { AppShellPage } from "@/components/design-system/app-shell";
import { SkeletonOperationsPage } from "@/components/shared";

export default function DashboardLoading() {
  return (
    <AppShellPage size="fluid">
      <SkeletonOperationsPage tableRows={6} tableColumns={3} />
    </AppShellPage>
  );
}
