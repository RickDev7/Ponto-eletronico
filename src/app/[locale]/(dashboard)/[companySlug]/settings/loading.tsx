import { Skeleton } from "@/components/ui/skeleton";
import { AppShellPage } from "@/components/design-system/layout/app-shell-content";

export default function SettingsLoading() {
  return (
    <AppShellPage size="fluid">
      <div className="space-y-3">
        <div className="space-y-1">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-3.5 w-64" />
        </div>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[220px_minmax(0,1fr)]">
          <Skeleton className="h-72 rounded-lg" />
          <div className="space-y-3">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-[420px] rounded-lg" />
          </div>
        </div>
      </div>
    </AppShellPage>
  );
}
