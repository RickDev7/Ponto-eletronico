"use client";

import { useTransition } from "react";
import { useTranslations, useLocale } from "next-intl";
import { FileText, Loader2 } from "lucide-react";
import { openServiceReportAction } from "@/actions/field-execution/actions";
import { toast } from "sonner";
import type { EmployeeServiceReportRow } from "@/lib/employee/load-employee-reports";
import { StatusBadge } from "@/components/shared";
import { Button } from "@/components/ui/button";

interface EmployeeReportsViewProps {
  slug: string;
  reports: EmployeeServiceReportRow[];
}

export function EmployeeReportsView({ slug, reports }: EmployeeReportsViewProps) {
  const t = useTranslations("employee.mobile.reports");
  const tStatus = useTranslations("status");
  const locale = useLocale();
  const [pending, startTransition] = useTransition();

  function openReport(reportId: string) {
    startTransition(async () => {
      const result = await openServiceReportAction(slug, reportId);
      if (result.success) window.open(result.data.url, "_blank");
      else toast.error(result.error);
    });
  }

  return (
    <div className="space-y-4 p-4">
      <div>
        <h1 className="text-lg font-semibold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      {reports.length === 0 ? (
        <div className="flex min-h-[40vh] flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-12 text-center">
          <FileText className="mb-3 size-10 text-muted-foreground/30" />
          <p className="font-medium">{t("emptyTitle")}</p>
          <p className="mt-1 max-w-xs text-sm text-muted-foreground">{t("emptyDescription")}</p>
        </div>
      ) : (
        <ul className="divide-y rounded-2xl border border-border/60 bg-card">
          {reports.map((report) => {
            const task = report.task;
            const addr = task?.address
              ? Array.isArray(task.address)
                ? task.address[0]
                : task.address
              : null;
            const client = addr?.client
              ? Array.isArray(addr.client)
                ? addr.client[0]
                : addr.client
              : null;
            const date = report.generated_at ?? report.signed_at;
            const canOpen = Boolean(report.storage_path);

            return (
              <li key={report.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{task?.title ?? t("untitled")}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {client?.name ?? report.client_name ?? "—"}
                      {date &&
                        ` · ${new Date(date).toLocaleDateString(locale, {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}`}
                    </p>
                  </div>
                  <StatusBadge
                    status={report.status === "generated" ? "success" : "info"}
                    label={tStatus(report.status === "generated" ? "completed" : "scheduled")}
                  />
                </div>
                {canOpen && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 w-full"
                    disabled={pending}
                    onClick={() => openReport(report.id)}
                  >
                    {pending ? (
                      <Loader2 className="mr-2 size-3.5 animate-spin" />
                    ) : (
                      <FileText className="mr-2 size-3.5" />
                    )}
                    {t("openPdf")}
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
