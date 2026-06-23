"use client";

import { useTransition } from "react";
import { useTranslations, useLocale } from "next-intl";
import { FileText, Loader2 } from "lucide-react";
import { openServiceReportAction } from "@/actions/field-execution/actions";
import { toast } from "sonner";
import { ROUTES } from "@/config/constants";
import type { EmployeeServiceReportRow } from "@/lib/employee/load-employee-reports";
import {
  AppBadge,
  AppCard,
  AppPageHeader,
  AppScreen,
} from "@/components/mobile/app";
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
    <AppScreen>
      <AppPageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        backHref={ROUTES.mobileProfile(slug)}
      />

      {reports.length === 0 ? (
        <AppCard className="flex min-h-[40vh] flex-col items-center justify-center py-12 text-center">
          <FileText className="mb-3 size-10 text-[var(--mobile-secondary)]/40" />
          <p className="text-base font-semibold text-[var(--mobile-text)]">{t("emptyTitle")}</p>
          <p className="mt-1 max-w-xs text-sm text-[var(--mobile-secondary)]">{t("emptyDescription")}</p>
        </AppCard>
      ) : (
        <ul className="space-y-3">
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
              <AppCard key={report.id} className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-semibold text-[var(--mobile-text)]">
                      {task?.title ?? t("untitled")}
                    </p>
                    <p className="mt-0.5 text-sm text-[var(--mobile-secondary)]">
                      {client?.name ?? report.client_name ?? "—"}
                      {date &&
                        ` · ${new Date(date).toLocaleDateString(locale, {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}`}
                    </p>
                  </div>
                  <AppBadge variant={report.status === "generated" ? "success" : "primary"}>
                    {tStatus(report.status === "generated" ? "completed" : "scheduled")}
                  </AppBadge>
                </div>
                {canOpen && (
                  <Button
                    variant="outline"
                    className="mobile-touch-target h-12 w-full rounded-[var(--mobile-radius-button)] text-base"
                    disabled={pending}
                    onClick={() => openReport(report.id)}
                  >
                    {pending ? (
                      <Loader2 className="size-5 animate-spin" />
                    ) : (
                      <FileText className="size-5" />
                    )}
                    {t("openPdf")}
                  </Button>
                )}
              </AppCard>
            );
          })}
        </ul>
      )}
    </AppScreen>
  );
}
