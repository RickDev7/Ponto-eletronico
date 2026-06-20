import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

function KpiSkeletonGrid({ count = 5 }: { count?: number }) {
  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-5">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-border/60 bg-card p-4 space-y-3"
        >
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-8 w-12" />
            </div>
            <Skeleton className="size-10 rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="mx-auto max-w-7xl p-6 space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-40" />
      </div>

      <div className="flex gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-24 rounded-lg" />
        ))}
      </div>

      <KpiSkeletonGrid count={5} />

      <div className="rounded-xl border border-border/60 p-4 space-y-3">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-28 w-full rounded-lg" />
      </div>

      <div className="rounded-xl border border-border/60 overflow-hidden">
        <div className="px-4 py-3 border-b">
          <Skeleton className="h-4 w-40" />
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 px-4 py-3 border-b last:border-b-0"
          >
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function DashboardSkeletonCompact({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-6", className)}>
      <KpiSkeletonGrid count={5} />
      <Skeleton className="h-40 w-full rounded-xl" />
    </div>
  );
}
