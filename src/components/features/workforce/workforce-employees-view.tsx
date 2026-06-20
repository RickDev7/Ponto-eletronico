"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ChevronRight, Users } from "lucide-react";
import { ROUTES } from "@/config/constants";
import type { WorkforceEmployeeRow } from "@/lib/workforce/workforce-data";
import { employeeName } from "@/lib/workforce/workforce-data";
import {
  EmptyState,
  OperationsPage,
  OperationsWorkspace,
  PageHeader,
  ROW_ACTION_TRIGGER_CLASS,
  StatusBadge,
} from "@/components/shared";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface WorkforceEmployeesViewProps {
  slug: string;
  employees: WorkforceEmployeeRow[];
}

const STATUS_TONE: Record<string, "success" | "info" | "warning" | "neutral"> = {
  active: "success",
  on_vacation: "info",
  absent: "warning",
  inactive: "neutral",
  terminated: "neutral",
};

export function WorkforceEmployeesView({ slug, employees }: WorkforceEmployeesViewProps) {
  const t = useTranslations("workforce.employees");
  const tStatus = useTranslations("workforce.status");

  return (
    <OperationsPage>
      <PageHeader title={t("title")} description={t("description", { count: employees.length })} />
      <OperationsWorkspace className="overflow-hidden">
        {employees.length === 0 ? (
          <EmptyState icon={Users} title={t("empty.title")} description={t("empty.description")} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>{t("columns.name")}</TableHead>
                <TableHead className="hidden sm:table-cell">{t("columns.role")}</TableHead>
                <TableHead className="hidden md:table-cell">{t("columns.supervisor")}</TableHead>
                <TableHead className="hidden lg:table-cell">{t("columns.hours")}</TableHead>
                <TableHead>{t("columns.status")}</TableHead>
                <TableHead className="w-7" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map((emp) => (
                <TableRow key={emp.id}>
                  <TableCell>
                    <Link href={ROUTES.workforceEmployee(slug, emp.id)} className="font-medium hover:text-primary">
                      {emp.full_name}
                    </Link>
                    {emp.employee_number && (
                      <p className="text-xs text-muted-foreground">#{emp.employee_number}</p>
                    )}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                    {emp.job_title ?? "—"}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                    {employeeName(emp.supervisor)}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-sm tabular-nums">
                    {emp.weekly_hours ?? 40}h
                  </TableCell>
                  <TableCell>
                    <StatusBadge
                      status={STATUS_TONE[emp.status] ?? "neutral"}
                      label={tStatus(emp.status as "active")}
                      showDot
                    />
                  </TableCell>
                  <TableCell>
                    <Link href={ROUTES.workforceEmployee(slug, emp.id)} className={ROW_ACTION_TRIGGER_CLASS}>
                      <ChevronRight className="size-3.5 text-muted-foreground" />
                    </Link>
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
