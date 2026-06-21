"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { CalendarClock, ChevronRight } from "lucide-react";
import { ROUTES } from "@/config/constants";
import { formatMinutes } from "@/lib/workforce/workforce-data";
import type { EmployeeAvailabilityRow } from "@/lib/workforce/employee-domain";
import { EmptyState, OperationsPage, OperationsWorkspace, PageHeader, StatusBadge } from "@/components/shared";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface WorkforceAvailabilityViewProps {
  slug: string;
  rows: EmployeeAvailabilityRow[];
  rangeLabel: string;
  planningHref: string;
}

const AVAILABILITY_TONE: Record<string, "success" | "info" | "warning" | "neutral"> = {
  available: "success",
  limited: "warning",
  overbooked: "warning",
  unavailable: "neutral",
};

export function WorkforceAvailabilityView({
  slug,
  rows,
  rangeLabel,
  planningHref,
}: WorkforceAvailabilityViewProps) {
  const t = useTranslations("workforce.availability");
  const tPlanning = useTranslations("workforce.planning.employees");

  return (
    <OperationsPage>
      <PageHeader
        title={t("title")}
        description={t("description", { period: rangeLabel })}
        actions={
          <Link
            href={planningHref}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium hover:bg-muted/50"
          >
            <CalendarClock className="size-3.5" />
            {t("openPlanning")}
          </Link>
        }
      />

      <OperationsWorkspace className="overflow-hidden">
        {rows.length === 0 ? (
          <EmptyState icon={CalendarClock} title={t("empty.title")} description={t("empty.description")} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>{t("columns.employee")}</TableHead>
                <TableHead className="hidden sm:table-cell">{t("columns.role")}</TableHead>
                <TableHead>{t("columns.availability")}</TableHead>
                <TableHead className="hidden md:table-cell">{t("columns.workload")}</TableHead>
                <TableHead className="hidden lg:table-cell">{t("columns.planned")}</TableHead>
                <TableHead className="hidden lg:table-cell">{t("columns.skills")}</TableHead>
                <TableHead className="w-7" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.employeeId}>
                  <TableCell>
                    <Link href={ROUTES.workforceEmployee(slug, row.employeeId)} className="font-medium hover:text-primary">
                      {row.fullName}
                    </Link>
                    {(row.onVacationToday || row.onSickToday) && (
                      <p className="text-[11px] text-muted-foreground">
                        {row.onVacationToday ? tPlanning("vacation") : tPlanning("sick")}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground sm:table-cell">
                    {row.jobTitle ?? "—"}
                  </TableCell>
                  <TableCell>
                    <StatusBadge
                      status={AVAILABILITY_TONE[row.availability] ?? "neutral"}
                      label={t(`status.${row.availability}`)}
                      showDot
                    />
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn(
                            "h-full rounded-full",
                            row.workloadPct > 100 ? "bg-rose-500" : row.workloadPct > 85 ? "bg-amber-500" : "bg-emerald-500",
                          )}
                          style={{ width: `${Math.min(100, row.workloadPct)}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">{row.workloadPct}%</span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground lg:table-cell">
                    {formatMinutes(row.plannedMinutes)}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground lg:table-cell">
                    {row.skillCount}
                  </TableCell>
                  <TableCell>
                    <Link href={ROUTES.workforceEmployee(slug, row.employeeId)} className={cn("inline-flex", "text-muted-foreground hover:text-foreground")}>
                      <ChevronRight className="size-4" />
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
