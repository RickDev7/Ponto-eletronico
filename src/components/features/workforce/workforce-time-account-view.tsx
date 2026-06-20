"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Clock } from "lucide-react";
import { ROUTES } from "@/config/constants";
import { formatMinutes, type TimeAccountSummary } from "@/lib/workforce/workforce-data";
import { EmptyState, OperationsPage, OperationsWorkspace, PageHeader } from "@/components/shared";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface WorkforceTimeAccountViewProps {
  slug: string;
  summaries: TimeAccountSummary[];
}

export function WorkforceTimeAccountView({ slug, summaries }: WorkforceTimeAccountViewProps) {
  const t = useTranslations("workforce.timeAccount");

  return (
    <OperationsPage>
      <PageHeader title={t("title")} description={t("description")} />
      <OperationsWorkspace className="overflow-hidden">
        {summaries.length === 0 ? (
          <EmptyState icon={Clock} title={t("empty.title")} description={t("empty.description")} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>{t("columns.employee")}</TableHead>
                <TableHead>{t("columns.contracted")}</TableHead>
                <TableHead>{t("columns.worked")}</TableHead>
                <TableHead>{t("columns.overtime")}</TableHead>
                <TableHead>{t("columns.balance")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {summaries.map((row) => (
                <TableRow key={row.employeeId}>
                  <TableCell>
                    <Link href={ROUTES.workforceEmployee(slug, row.employeeId)} className="font-medium hover:text-primary">
                      {row.employeeName}
                    </Link>
                  </TableCell>
                  <TableCell className="tabular-nums">{formatMinutes(row.sollMinutes)}</TableCell>
                  <TableCell className="tabular-nums">{formatMinutes(row.istMinutes)}</TableCell>
                  <TableCell className="tabular-nums">{formatMinutes(row.overtimeMinutes)}</TableCell>
                  <TableCell className={`tabular-nums font-medium ${row.balanceMinutes < 0 ? "text-destructive" : "text-emerald-600"}`}>
                    {formatMinutes(row.balanceMinutes)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </OperationsWorkspace>
    </OperationsPage>
  );
}
