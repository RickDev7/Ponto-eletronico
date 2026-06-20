import { AppShellPage } from "@/components/design-system/app-shell";
import { SkeletonOperationsPage } from "@/components/shared";

export default function AddressesLoading() {
  return (
    <AppShellPage size="fluid">
      <SkeletonOperationsPage showFilters tableRows={14} tableColumns={6} />
    </AppShellPage>
  );
}
