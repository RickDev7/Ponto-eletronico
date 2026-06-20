import { Skeleton } from "@/components/ui/skeleton";
import { AppShellPage } from "@/components/design-system/layout/app-shell-content";

export default function TaskSeriesLoading() {
  return (
    <AppShellPage size="fluid">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    </AppShellPage>
  );
}
