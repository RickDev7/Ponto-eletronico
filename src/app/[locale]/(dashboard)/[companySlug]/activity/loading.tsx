import { Skeleton } from "@/components/ui/skeleton";
import { AppShellPage } from "@/components/design-system/layout/app-shell-content";

export default function ActivityLoading() {
  return (
    <AppShellPage size="fluid">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3.5 w-52" />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 xl:grid-cols-[minmax(0,1fr)_272px]">
          <div className="space-y-2">
            <Skeleton className="h-12 w-full rounded-lg" />
            <div className="rounded-lg border border-border p-3 space-y-4">
              <Skeleton className="h-3 w-16" />
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="size-7 rounded-full shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Skeleton className="h-48 w-full rounded-lg" />
            <Skeleton className="h-36 w-full rounded-lg" />
          </div>
        </div>
      </div>
    </AppShellPage>
  );
}
