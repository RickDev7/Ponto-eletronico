"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { FileSpreadsheet } from "lucide-react";
import { ROUTES } from "@/config/constants";
import { formatMinutes } from "@/lib/workforce/workforce-data";
import { EmptyState, OperationsPage, OperationsWorkspace, PageHeader } from "@/components/shared";

interface TimesheetEntry {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  minutes: number;
  taskTitle: string;
}

interface WorkforceTimesheetsViewProps {
  slug: string;
  entries: TimesheetEntry[];
  locale: string;
}

export function WorkforceTimesheetsView({ slug, entries, locale }: WorkforceTimesheetsViewProps) {
  const t = useTranslations("workforce.timesheets");

  return (
    <OperationsPage>
      <PageHeader title={t("title")} description={t("description")} />
      <OperationsWorkspace>
        {entries.length === 0 ? (
          <EmptyState icon={FileSpreadsheet} title={t("empty.title")} description={t("empty.description")} />
        ) : (
          <div className="divide-y">
            {entries.map((entry) => (
              <div key={entry.id} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <Link href={ROUTES.workforceEmployee(slug, entry.employeeId)} className="font-medium hover:text-primary">
                    {entry.employeeName}
                  </Link>
                  <p className="text-xs text-muted-foreground">{entry.taskTitle}</p>
                </div>
                <div className="text-sm tabular-nums text-muted-foreground">
                  {new Date(entry.date + "T12:00:00").toLocaleDateString(locale)} · {formatMinutes(entry.minutes)}
                </div>
              </div>
            ))}
          </div>
        )}
      </OperationsWorkspace>
    </OperationsPage>
  );
}
