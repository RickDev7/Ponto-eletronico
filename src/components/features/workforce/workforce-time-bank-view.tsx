"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ROUTES } from "@/config/constants";
import type { TimeAccountSummary } from "@/lib/workforce/workforce-data";
import type { TimeTrackingReport } from "@/lib/time-tracking/compute-time-summary";
import { WorkforceTimeAccountView } from "@/components/features/workforce/workforce-time-account-view";
import { TimeTrackingView } from "@/components/features/time-tracking/time-tracking-view";
import { WorkforceTimesheetsView } from "@/components/features/workforce/workforce-timesheets-view";
import { OperationsPage, PageHeader } from "@/components/shared";
import { cn } from "@/lib/utils";

export type TimeBankTab = "account" | "tracking" | "timesheets";

interface TimesheetEntry {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  minutes: number;
  taskTitle: string;
}

interface WorkforceTimeBankViewProps {
  slug: string;
  tab: TimeBankTab;
  summaries: TimeAccountSummary[];
  tracking?: {
    locale: string;
    report: TimeTrackingReport;
    anchorDate: string;
  };
  timesheets?: {
    entries: TimesheetEntry[];
    locale: string;
  };
}

export function WorkforceTimeBankView({
  slug,
  tab,
  summaries,
  tracking,
  timesheets,
}: WorkforceTimeBankViewProps) {
  const t = useTranslations("workforce.timeBank");

  const tabs: { key: TimeBankTab; label: string }[] = [
    { key: "account", label: t("tabs.account") },
    { key: "tracking", label: t("tabs.tracking") },
    { key: "timesheets", label: t("tabs.timesheets") },
  ];

  return (
    <OperationsPage>
      <PageHeader title={t("title")} description={t("description")} />

      <div className="flex flex-wrap gap-1.5 border-b border-border/60 pb-3">
        {tabs.map((item) => (
          <Link
            key={item.key}
            href={ROUTES.workforceTimeBank(slug, { tab: item.key })}
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

      {tab === "tracking" && tracking ? (
        <TimeTrackingView
          slug={slug}
          locale={tracking.locale}
          report={tracking.report}
          anchorDate={tracking.anchorDate}
          embedded
        />
      ) : tab === "timesheets" && timesheets ? (
        <WorkforceTimesheetsView
          slug={slug}
          entries={timesheets.entries}
          locale={timesheets.locale}
          embedded
        />
      ) : (
        <WorkforceTimeAccountView slug={slug} summaries={summaries} embedded />
      )}
    </OperationsPage>
  );
}
