"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ROUTES } from "@/config/constants";
import type { TraceableExecution } from "@/lib/operations/traceable-execution-types";
import { OperationsJobsView } from "@/components/features/operations/operations-jobs-view";
import { OperationsVisitsView } from "@/components/features/operations/operations-visits-view";
import { OperationsPage, PageHeader } from "@/components/shared";
import { cn } from "@/lib/utils";

export type WorkOrdersTab = "jobs" | "visits";

interface OperationsWorkOrdersViewProps {
  slug: string;
  locale: string;
  tab: WorkOrdersTab;
  executions: TraceableExecution[];
}

export function OperationsWorkOrdersView({
  slug,
  locale,
  tab,
  executions,
}: OperationsWorkOrdersViewProps) {
  const t = useTranslations("operations.workOrders");

  const tabs: { key: WorkOrdersTab; label: string }[] = [
    { key: "jobs", label: t("tabs.jobs") },
    { key: "visits", label: t("tabs.visits") },
  ];

  return (
    <OperationsPage>
      <PageHeader title={t("title")} description={t("description")} />

      <div className="flex flex-wrap gap-1.5 border-b border-border/60 pb-3">
        {tabs.map((item) => (
          <Link
            key={item.key}
            href={ROUTES.operationsWorkOrders(slug, { tab: item.key })}
            className={cn(
              "rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
              tab === item.key
                ? "border-primary bg-primary/10 text-primary"
                : "border-border/60 text-muted-foreground hover:bg-muted/50",
            )}
          >
            {item.label}
          </Link>
        ))}
      </div>

      {tab === "visits" ? (
        <OperationsVisitsView slug={slug} visits={executions} locale={locale} embedded />
      ) : (
        <OperationsJobsView slug={slug} executions={executions} locale={locale} embedded />
      )}
    </OperationsPage>
  );
}
