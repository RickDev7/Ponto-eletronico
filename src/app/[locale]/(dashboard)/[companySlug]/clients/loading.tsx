import { AppShellPage } from "@/components/design-system/app-shell";
import { SkeletonOperationsPage } from "@/components/shared";

export default function ClientsLoading() {
  return (
    <AppShellPage size="fluid">
      <SkeletonOperationsPage tableRows={14} tableColumns={5} />
    </AppShellPage>
  );
}
