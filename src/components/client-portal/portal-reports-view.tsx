"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { Download, FileText } from "lucide-react";
import { formatDate } from "@/lib/finance/utils";
import { getPortalReportDownloadUrl } from "@/actions/client-portal/download";
import type { PortalReportRow } from "@/lib/client-portal/load-portal-data";
import {
  EmptyState,
  OperationsPage,
  PageHeader,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

interface PortalReportsViewProps {
  slug: string;
  reports: PortalReportRow[];
  locale: string;
}

export function PortalReportsView({
  slug,
  reports,
  locale,
}: PortalReportsViewProps) {
  const t = useTranslations("clientPortal.reports");
  const [isPending, startTransition] = useTransition();

  function downloadReport(report: PortalReportRow) {
    if (!report.storage_path) {
      toast.error(t("noFile"));
      return;
    }

    startTransition(async () => {
      const result = await getPortalReportDownloadUrl(slug, {
        storagePath: report.storage_path!,
        source: report.source,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      if (!result.data?.url) {
        toast.error(t("downloadFailed"));
        return;
      }
      window.open(result.data.url, "_blank", "noopener,noreferrer");
    });
  }

  return (
    <OperationsPage>
      <PageHeader title={t("title")} description={t("description")} />

      {reports.length === 0 ? (
        <EmptyState title={t("empty")} icon={FileText} />
      ) : (
        <div className="rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("columns.title")}</TableHead>
                <TableHead>{t("columns.type")}</TableHead>
                <TableHead>{t("columns.period")}</TableHead>
                <TableHead>{t("columns.generated")}</TableHead>
                <TableHead className="w-[100px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map((report) => (
                <TableRow key={`${report.source}-${report.id}`}>
                  <TableCell className="font-medium">{report.title}</TableCell>
                  <TableCell>{t(`types.${report.report_type}`, { default: report.report_type })}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {report.period_start
                      ? formatDate(report.period_start, locale)
                      : "—"}
                    {report.period_end
                      ? ` – ${formatDate(report.period_end, locale)}`
                      : ""}
                  </TableCell>
                  <TableCell>{formatDate(report.generated_at, locale)}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={!report.storage_path || isPending}
                      onClick={() => downloadReport(report)}
                    >
                      <Download className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </OperationsPage>
  );
}
