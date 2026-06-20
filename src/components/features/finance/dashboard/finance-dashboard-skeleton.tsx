import { AppShellPage } from "@/components/design-system/layout";

function Block({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-muted/60 ${className ?? ""}`} />;
}

export function FinanceDashboardSkeleton() {
  return (
    <AppShellPage size="fluid">
      <div className="space-y-6 p-1">
        <div className="space-y-2">
          <Block className="h-8 w-48" />
          <Block className="h-4 w-72" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Block key={i} className="h-28" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-12">
          <div className="space-y-4 lg:col-span-8">
            <Block className="h-80" />
            <Block className="h-56" />
            <Block className="h-64" />
          </div>
          <div className="space-y-4 lg:col-span-4">
            <Block className="h-44" />
            <Block className="h-52" />
            <Block className="h-48" />
            <Block className="h-56" />
          </div>
        </div>
      </div>
    </AppShellPage>
  );
}
