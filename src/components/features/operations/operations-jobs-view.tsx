"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ClipboardList } from "lucide-react";
import { ROUTES } from "@/config/constants";
import {
  resolveExecutionStatus,
  type ExecutionRow,
} from "@/lib/operations/operations-data";
import { ExecutionStatusBadge } from "@/components/features/operations/execution-status-badge";
import {
  EmptyState,
  OperationsPage,
  OperationsWorkspace,
  PageHeader,
  ROW_ACTION_TRIGGER_CLASS,
} from "@/components/shared";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface OperationsJobsViewProps {
  slug: string;
  executions: ExecutionRow[];
  locale: string;
}

export function OperationsJobsView({ slug, executions, locale }: OperationsJobsViewProps) {
  const t = useTranslations("operations.jobs");

  const sorted = useMemo(
    () => [...executions].sort((a, b) => b.scheduled_date.localeCompare(a.scheduled_date)),
    [executions],
  );

  return (
    <OperationsPage>
      <PageHeader title={t("title")} description={t("description")} />

      <OperationsWorkspace className="overflow-hidden">
        {sorted.length === 0 ? (
          <EmptyState icon={ClipboardList} title={t("empty.title")} description={t("empty.description")} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>{t("columns.service")}</TableHead>
                <TableHead className="hidden sm:table-cell">{t("columns.property")}</TableHead>
                <TableHead>{t("columns.date")}</TableHead>
                <TableHead>{t("columns.status")}</TableHead>
                <TableHead className="w-7" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((job) => {
                const addr = job.address;
                const assignee = job.assignments?.[0]?.employee;
                const assigneeName = Array.isArray(assignee)
                  ? assignee[0]?.full_name
                  : assignee?.full_name;
                return (
                  <TableRow key={job.id}>
                    <TableCell>
                      <Link
                        href={ROUTES.task(slug, job.id)}
                        className="text-sm font-medium hover:text-primary"
                      >
                        {job.title}
                      </Link>
                      {assigneeName && (
                        <p className="text-xs text-muted-foreground">{assigneeName}</p>
                      )}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                      {addr ? `${addr.street}, ${addr.city}` : "—"}
                    </TableCell>
                    <TableCell className="text-sm tabular-nums">
                      {new Date(job.scheduled_date + "T12:00:00").toLocaleDateString(locale)}
                    </TableCell>
                    <TableCell>
                      <ExecutionStatusBadge status={resolveExecutionStatus(job)} />
                    </TableCell>
                    <TableCell>
                      <Link href={ROUTES.task(slug, job.id)} className={ROW_ACTION_TRIGGER_CLASS}>
                        →
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </OperationsWorkspace>
    </OperationsPage>
  );
}
