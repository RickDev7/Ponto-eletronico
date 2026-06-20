import { Skeleton as ShadcnSkeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { WithClassName } from "./types";

export interface SkeletonProps
  extends WithClassName,
    React.ComponentProps<typeof ShadcnSkeleton> {}

/** Base skeleton — wraps Shadcn primitive. */
export function Skeleton({ className, ...props }: SkeletonProps) {
  return <ShadcnSkeleton className={className} {...props} />;
}

export interface SkeletonTextProps extends WithClassName {
  lines?: number;
  lastLineWidth?: string;
}

/** Multi-line text placeholder. */
export function SkeletonText({
  lines = 3,
  lastLineWidth = "w-2/3",
  className,
}: SkeletonTextProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn(
            "h-3",
            i === lines - 1 ? lastLineWidth : "w-full",
          )}
        />
      ))}
    </div>
  );
}

export interface SkeletonBlockProps extends WithClassName {
  height?: string | number;
  width?: string | number;
  rounded?: "sm" | "md" | "lg" | "xl" | "full";
}

const roundedMap = {
  sm: "rounded-sm",
  md: "rounded-md",
  lg: "rounded-lg",
  xl: "rounded-xl",
  full: "rounded-full",
} as const;

/** Rectangular placeholder block. */
export function SkeletonBlock({
  height = "h-24",
  width = "w-full",
  rounded = "lg",
  className,
}: SkeletonBlockProps) {
  const heightClass = typeof height === "number" ? undefined : height;
  const widthClass = typeof width === "number" ? undefined : width;

  return (
    <Skeleton
      className={cn(heightClass, widthClass, roundedMap[rounded], className)}
      style={{
        height: typeof height === "number" ? height : undefined,
        width: typeof width === "number" ? width : undefined,
      }}
    />
  );
}

export interface SkeletonCardProps extends WithClassName {
  rows?: number;
  showHeader?: boolean;
}

/** Card-shaped loading placeholder. */
export function SkeletonCard({
  rows = 3,
  showHeader = true,
  className,
}: SkeletonCardProps) {
  return (
    <div
      className={cn(
        "space-y-3 rounded-lg border border-border bg-card/20 p-3",
        className,
      )}
    >
      {showHeader && (
        <div className="flex items-center justify-between gap-3">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="size-7 rounded-md" />
        </div>
      )}
      <SkeletonText lines={rows} />
    </div>
  );
}

export interface SkeletonTableProps extends WithClassName {
  rows?: number;
  columns?: number;
}

/** Operations table loading placeholder. */
export function SkeletonTable({
  rows = 8,
  columns = 5,
  className,
}: SkeletonTableProps) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border border-border bg-card/20",
        className,
      )}
    >
      <div className="flex items-center gap-3 border-b border-border px-2.5 py-1.5">
        {Array.from({ length: columns }).map((_, col) => (
          <Skeleton
            key={col}
            className={cn(
              "h-2.5",
              col === 0 ? "w-24" : col === columns - 1 ? "ml-auto w-8" : "w-20",
            )}
          />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, row) => (
        <div
          key={row}
          className="flex items-center gap-3 border-b border-border px-2.5 py-1.5 last:border-b-0"
        >
          {Array.from({ length: columns }).map((__, col) => (
            <Skeleton
              key={col}
              className={cn(
                "h-3",
                col === 0 ? "w-32" : col === columns - 1 ? "ml-auto w-6" : "w-24",
              )}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export interface SkeletonKpiGridProps extends WithClassName {
  count?: number;
}

/** KPI strip loading state — matches Dashboard workspace. */
export function SkeletonKpiGrid({ count = 5, className }: SkeletonKpiGridProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 divide-y divide-border overflow-hidden rounded-lg border border-border bg-card/20 sm:grid-cols-3 sm:divide-x sm:divide-y-0 lg:grid-cols-5",
        className,
      )}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-1.5 px-2.5 py-2">
          <Skeleton className="h-6 w-10" />
          <Skeleton className="h-2 w-16" />
        </div>
      ))}
    </div>
  );
}

export interface SkeletonOperationsPageProps extends WithClassName {
  showFilters?: boolean;
  tableRows?: number;
  tableColumns?: number;
}

/** Standard operational page loading — header + optional filters + table. */
export function SkeletonOperationsPage({
  showFilters = false,
  tableRows = 8,
  tableColumns = 5,
  className,
}: SkeletonOperationsPageProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-56" />
        </div>
        <Skeleton className="h-7 w-24 rounded-md" />
      </div>
      {showFilters && <SkeletonBlock height="h-9" rounded="lg" />}
      <SkeletonTable rows={tableRows} columns={tableColumns} />
    </div>
  );
}
