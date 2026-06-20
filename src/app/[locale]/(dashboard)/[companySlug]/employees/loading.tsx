import { AppShellPage } from "@/components/design-system/app-shell";
import { SkeletonOperationsPage } from "@/components/shared";

export default function EmployeesLoading() {
  return (
    <AppShellPage size="fluid">
      <SkeletonOperationsPage tableRows={14} tableColumns={6} />
    </AppShellPage>
  );
}
