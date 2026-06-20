import { AppShellPage } from "@/components/design-system/layout/app-shell-content";
import { Skeleton } from "@/components/ui/skeleton";

export default function CalendarLoading() {
  return (
    <AppShellPage size="fluid">
      <div className="space-y-2 pb-4">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
          <div className="flex gap-1.5">
            <Skeleton className="h-7 w-28 rounded-lg" />
            <Skeleton className="h-7 w-36 rounded-lg" />
            <Skeleton className="h-7 w-16 rounded-lg" />
            <Skeleton className="h-7 w-20 rounded-lg" />
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-border">
          <div className="grid grid-cols-4 divide-x divide-border">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="px-3 py-2">
                <Skeleton className="h-5 w-8" />
                <Skeleton className="mt-1.5 h-3 w-20" />
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-2 xl:grid-cols-[1fr_280px]">
          <div className="overflow-hidden rounded-lg border border-border">
            <div className="grid grid-cols-7 border-b">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="py-1.5 flex justify-center">
                  <Skeleton className="h-3 w-5" />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {Array.from({ length: 35 }).map((_, i) => (
                <div
                  key={i}
                  className="min-h-[100px] border-b border-r border-border/40 p-1.5 space-y-1"
                >
                  <Skeleton className="size-5 rounded-full" />
                  {i % 4 === 0 && <Skeleton className="h-8 w-full rounded-md" />}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="overflow-hidden rounded-lg border border-border">
                <div className="border-b px-2.5 py-1.5">
                  <Skeleton className="h-3 w-24" />
                </div>
                <div className="space-y-1.5 p-2">
                  <Skeleton className="h-12 w-full rounded-md" />
                  <Skeleton className="h-12 w-full rounded-md" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShellPage>
  );
}
