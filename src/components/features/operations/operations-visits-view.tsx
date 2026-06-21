"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { CalendarDays } from "lucide-react";
import { ROUTES } from "@/config/constants";
import { resolveExecutionStatus } from "@/lib/operations/operations-data";
import { resolveTraceability } from "@/lib/operations/operations-workflow";
import type { TraceableExecution } from "@/lib/operations/traceable-execution-types";
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
import { cn } from "@/lib/utils";

type VisitFilter = "all" | "upcoming" | "overdue" | "completed" | "gaps";

interface OperationsVisitsViewProps {
  slug: string;
  visits: TraceableExecution[];
  locale: string;
  embedded?: boolean;
}

export function OperationsVisitsView({ slug, visits, locale, embedded }: OperationsVisitsViewProps) {
  const t = useTranslations("operations.visits");
  const [filter, setFilter] = useState<VisitFilter>("all");
  const today = new Date().toISOString().slice(0, 10);
  const dateLocale = locale === "en" ? "en-US" : "pt-BR";

  const filtered = useMemo(() => {
    const sorted = [...visits].sort((a, b) => b.scheduled_date.localeCompare(a.scheduled_date));
    switch (filter) {
      case "upcoming":
        return sorted.filter(
          (v) => v.scheduled_date >= today && v.status !== "completed" && !v.approved_at,
        );
      case "overdue":
        return sorted.filter(
          (v) => v.scheduled_date < today && v.status !== "completed" && !v.approved_at,
        );
      case "completed":
        return sorted.filter((v) => v.status === "completed" || v.approved_at);
      case "gaps":
        return sorted.filter((v) => !resolveTraceability(v).isFullyTraceable);
      default:
        return sorted;
    }
  }, [visits, filter, today]);

  const filters: { key: VisitFilter; label: string }[] = [
    { key: "all", label: t("filters.all") },
    { key: "upcoming", label: t("filters.upcoming") },
    { key: "overdue", label: t("filters.overdue") },
    { key: "completed", label: t("filters.completed") },
    { key: "gaps", label: t("filters.gaps") },
  ];

  return (
    <OperationsPage className={embedded ? "gap-4" : undefined}>
      {!embedded && <PageHeader title={t("title")} description={t("description")} />}

      <div className="flex flex-wrap gap-1.5">
        {filters.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={cn(
              "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
              filter === f.key
                ? "border-primary bg-primary/10 text-primary"
                : "border-border/60 text-muted-foreground hover:bg-muted/50",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <OperationsWorkspace className="overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState icon={CalendarDays} title={t("empty.title")} description={t("empty.description")} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>{t("columns.visit")}</TableHead>
                <TableHead className="hidden md:table-cell">{t("columns.client")}</TableHead>
                <TableHead className="hidden sm:table-cell">{t("columns.property")}</TableHead>
                <TableHead className="hidden lg:table-cell">{t("columns.contract")}</TableHead>
                <TableHead className="hidden lg:table-cell">{t("columns.service")}</TableHead>
                <TableHead>{t("columns.date")}</TableHead>
                <TableHead>{t("columns.status")}</TableHead>
                <TableHead className="w-7" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((visit) => {
                const assignee = visit.assignments?.[0]?.employee;
                const assigneeName = Array.isArray(assignee)
                  ? assignee[0]?.full_name
                  : assignee?.full_name;
                const trace = resolveTraceability(visit);
                return (
                  <TableRow key={visit.id}>
                    <TableCell>
                      <Link
                        href={ROUTES.task(slug, visit.id)}
                        className="text-sm font-medium hover:text-primary"
                      >
                        {visit.title}
                      </Link>
                      {assigneeName && (
                        <p className="text-xs text-muted-foreground">{assigneeName}</p>
                      )}
                      {!trace.isFullyTraceable && (
                        <span className="mt-0.5 inline-flex rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-400">
                          {t("traceGap")}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      {visit.clientName ?? "—"}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                      {visit.address
                        ? `${visit.address.street}, ${visit.address.city}`
                        : "—"}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                      {visit.contract_id ? (
                        <Link
                          href={ROUTES.financeContract(slug, visit.contract_id)}
                          className="hover:text-primary"
                        >
                          {visit.contractNumber ?? visit.contractTitle ?? "—"}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                      {visit.serviceName ?? visit.service_type}
                    </TableCell>
                    <TableCell className="text-sm tabular-nums">
                      {new Date(visit.scheduled_date + "T12:00:00").toLocaleDateString(dateLocale)}
                    </TableCell>
                    <TableCell>
                      <ExecutionStatusBadge status={resolveExecutionStatus(visit)} />
                    </TableCell>
                    <TableCell>
                      <Link href={ROUTES.task(slug, visit.id)} className={ROW_ACTION_TRIGGER_CLASS}>
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
