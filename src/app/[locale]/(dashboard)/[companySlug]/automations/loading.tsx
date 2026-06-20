import { AppShellPage } from "@/components/design-system/layout";
import { FinanceDashboardSkeleton } from "@/components/features/finance/dashboard/finance-dashboard-skeleton";

export default function AutomationsLoading() {
  return (
    <AppShellPage size="fluid">
      <FinanceDashboardSkeleton />
    </AppShellPage>
  );
}
