"use client";

import { Fragment, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  ShieldCheck,
  Search,
  Plus,
  ChevronDown,
  ChevronRight,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Camera,
  FileText,
  ListChecks,
  Lightbulb,
  Download,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  EmptyState,
  StatusBadge,
  type StatusTone,
} from "@/components/shared";
import { OperationsPage, OperationsWorkspace } from "@/components/shared/workspace";
import { PageHeader } from "@/components/shared/page-header";
import { KpiCard } from "@/components/shared/kpi-card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { AuditViolationRow } from "@/lib/audits/violations";

export type AuditRow = AuditViolationRow;

interface AuditsViewProps {
  slug: string;
  days: number;
  rows: AuditRow[];
  metrics: {
    pending: number;
    passed: number;
    failed: number;
    inReview: number;
  };
}

type AuditStatus = "passed" | "failed" | "pending" | "review";

const TABLE_COLUMNS = 7;

function rowStatus(row: AuditRow): AuditStatus {
  if (row.type === "gps_missing") return "review";
  return "failed";
}

function rowScore(row: AuditRow): number {
  if (row.type === "gps_missing") return 0;
  const d = row.distance ?? 0;
  return Math.max(0, Math.min(100, 100 - Math.round(d / 15)));
}

function AuditStatusPill({ status }: { status: AuditStatus }) {
  const t = useTranslations("audits");
  const tone: Record<AuditStatus, StatusTone> = {
    passed: "success",
    failed: "danger",
    pending: "pending",
    review: "warning",
  };
  return (
    <StatusBadge
      status={tone[status]}
      label={t(`statusLabels.${status}`)}
      showDot
      className="h-[18px] gap-1 border-0 bg-muted/40 px-1.5 py-0 text-[10px] font-medium leading-none shadow-none"
    />
  );
}

export function AuditsView({ slug, days, rows, metrics }: AuditsViewProps) {
  const t = useTranslations("audits");
  const locale = useLocale();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      if (typeFilter !== "all" && row.type !== typeFilter) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        row.taskTitle.toLowerCase().includes(q) ||
        row.employee.toLowerCase().includes(q) ||
        row.addressLabel.toLowerCase().includes(q)
      );
    });
  }, [rows, search, typeFilter]);

  const timeline = useMemo(() => {
    const map = new Map<string, AuditRow[]>();
    for (const row of rows) {
      const day = row.checkInAt.slice(0, 10);
      if (!map.has(day)) map.set(day, []);
      map.get(day)!.push(row);
    }
    return [...map.entries()].sort(([a], [b]) => b.localeCompare(a));
  }, [rows]);

  return (
    <OperationsPage className="pb-4">
      <PageHeader
        title={t("complianceTitle")}
        description={t("periodDescription", { days })}
        compact
        actions={
          <div className="flex items-center gap-1.5">
            <Link
              href={`/${slug}/audits/export?days=${days}`}
              className="inline-flex h-7 items-center gap-1 rounded-md border border-border px-2.5 text-[11px] font-medium transition-colors hover:bg-muted/50"
            >
              <Download className="size-3" />
              {t("exportCsv")}
            </Link>
            <Button size="sm" className="h-7" disabled title={t("createDisabled")}>
              <Plus className="size-3" />
              {t("create")}
            </Button>
          </div>
        }
      />

      {/* Filters toolbar */}
      <OperationsWorkspace>
        <div className="flex flex-col gap-2 border-b border-border/60 p-2.5 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative min-w-0 flex-1 lg:max-w-xs">
            <Search className="absolute left-2 top-1/2 size-3 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t("searchPlaceholder")}
              className="h-7 pl-7 text-[11px]"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-7 w-[140px] text-[11px]">
                <SelectValue placeholder={t("filters.type")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("types.all")}</SelectItem>
                <SelectItem value="gps_missing">{t("types.gps_missing")}</SelectItem>
                <SelectItem value="outside_radius">{t("types.outside_radius")}</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center rounded-lg border border-border/70 bg-card/30 p-0.5">
              {[7, 14, 30].map((d) => (
                <Link
                  key={d}
                  href={`/${slug}/audits?days=${d}`}
                  className={cn(
                    "rounded-md px-2 py-1 text-[11px] font-medium transition-colors",
                    d === days
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {t("filters.periodDays", { days: d })}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </OperationsWorkspace>

      {/* Compliance overview */}
      <OperationsWorkspace className="mt-2">
        <div className="grid grid-cols-2 divide-x divide-border/60 border-b border-border/60 lg:grid-cols-4">
          <KpiCard
            variant="strip"
            label={t("kpis.pending")}
            value={metrics.pending}
            icon={Clock}
          />
          <KpiCard
            variant="strip"
            label={t("kpis.passed")}
            value={metrics.passed}
            icon={CheckCircle2}
            iconClassName="text-emerald-500/70"
          />
          <KpiCard
            variant="strip"
            label={t("kpis.failed")}
            value={metrics.failed}
            icon={AlertTriangle}
            iconClassName="text-destructive/70"
          />
          <KpiCard
            variant="strip"
            label={t("kpis.inReview")}
            value={metrics.inReview}
            icon={ShieldCheck}
            iconClassName="text-amber-500/70"
          />
        </div>
      </OperationsWorkspace>

      {/* Audit table */}
      <OperationsWorkspace className="mt-2 overflow-hidden">
        <div className="flex items-center justify-between border-b border-border/80 px-2.5 py-0.5">
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            {t("title")}
          </span>
          <span className="text-[10px] tabular-nums text-muted-foreground">
            {t("entries", { count: filtered.length })}
          </span>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={CheckCircle2}
            title={t("empty.noViolations")}
            description={t("empty.noViolationsDescription")}
            size="sm"
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-border/60 hover:bg-transparent">
                <TableHead className="min-w-[180px]">{t("tableColumns.audit")}</TableHead>
                <TableHead className="hidden w-40 md:table-cell">{t("tableColumns.property")}</TableHead>
                <TableHead className="hidden w-32 lg:table-cell">{t("tableColumns.client")}</TableHead>
                <TableHead className="hidden w-32 sm:table-cell">{t("tableColumns.inspector")}</TableHead>
                <TableHead className="w-28">{t("tableColumns.date")}</TableHead>
                <TableHead className="w-28">{t("tableColumns.status")}</TableHead>
                <TableHead className="w-16 text-right">{t("tableColumns.score")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((row) => {
                const status = rowStatus(row);
                const score = rowScore(row);
                const isExpanded = expandedId === row.id;

                return (
                  <Fragment key={row.id}>
                    <TableRow
                      className={cn(
                        "cursor-pointer border-border/50",
                        isExpanded && "bg-muted/20",
                      )}
                      onClick={() => setExpandedId(isExpanded ? null : row.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setExpandedId(isExpanded ? null : row.id);
                        }
                      }}
                      tabIndex={0}
                      role="button"
                      aria-expanded={isExpanded}
                    >
                      <TableCell className="max-w-0 py-1 whitespace-normal">
                        <div className="flex min-w-0 items-center gap-1.5">
                          <span className="shrink-0 text-muted-foreground">
                            {isExpanded ? (
                              <ChevronDown className="size-3" />
                            ) : (
                              <ChevronRight className="size-3" />
                            )}
                          </span>
                          <div className="min-w-0 leading-tight">
                            {row.taskId ? (
                              <Link
                                href={`/${slug}/tasks/${row.taskId}`}
                                onClick={(e) => e.stopPropagation()}
                                className="block truncate text-[12px] font-medium tracking-[-0.01em] hover:text-primary"
                              >
                                {row.taskTitle}
                              </Link>
                            ) : (
                              <span className="block truncate text-[12px] font-medium">
                                {row.taskTitle}
                              </span>
                            )}
                            <p className="mt-px truncate text-[10px] text-muted-foreground">
                              {row.type === "gps_missing"
                                ? t("rowTypes.gpsMissing")
                                : t("rowTypes.outsideRadius")}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden py-1 md:table-cell">
                        <span className="block truncate text-[11px] text-muted-foreground">
                          {row.addressLabel}
                        </span>
                      </TableCell>
                      <TableCell className="hidden py-1 lg:table-cell">
                        <span className="text-[11px] text-muted-foreground/50">—</span>
                      </TableCell>
                      <TableCell className="hidden py-1 sm:table-cell">
                        <span className="block truncate text-[11px] text-muted-foreground">
                          {row.employee}
                        </span>
                      </TableCell>
                      <TableCell className="py-1">
                        <span className="text-[11px] tabular-nums text-muted-foreground">
                          {new Date(row.checkInAt).toLocaleDateString(locale, {
                            day: "2-digit",
                            month: "2-digit",
                          })}
                        </span>
                      </TableCell>
                      <TableCell className="py-1">
                        <AuditStatusPill status={status} />
                      </TableCell>
                      <TableCell className="py-1 text-right">
                        <span
                          className={cn(
                            "text-[11px] font-semibold tabular-nums",
                            score >= 70
                              ? "text-emerald-600 dark:text-emerald-400"
                              : score >= 40
                                ? "text-amber-600 dark:text-amber-400"
                                : "text-destructive",
                          )}
                        >
                          {score}
                        </span>
                      </TableCell>
                    </TableRow>

                    {isExpanded && (
                      <TableRow className="border-border/50 bg-muted/5 hover:bg-muted/5">
                        <TableCell colSpan={TABLE_COLUMNS} className="px-2.5 py-2">
                          <AuditDetailPanel row={row} score={score} status={status} />
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        )}
      </OperationsWorkspace>

      {/* Timeline */}
      {timeline.length > 0 && (
        <OperationsWorkspace className="mt-2">
          <div className="border-b border-border/60 px-2.5 py-1.5">
            <span className="text-[11px] font-medium">{t("timelineTitle")}</span>
          </div>
          <div className="space-y-0 p-2.5">
            {timeline.map(([day, dayRows]) => (
              <div key={day} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="size-2 rounded-full bg-primary/60" />
                  <div className="w-px flex-1 bg-border/60" />
                </div>
                <div className="min-w-0 flex-1 pb-4">
                  <p className="text-[11px] font-medium tabular-nums">
                    {new Date(`${day}T12:00:00`).toLocaleDateString(locale, {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                  <div className="mt-1 space-y-1">
                    {dayRows.map((row) => (
                      <div
                        key={row.id}
                        className="flex items-center justify-between gap-2 rounded-md border border-border/50 bg-background/50 px-2 py-1"
                      >
                        <span className="truncate text-[11px]">{row.taskTitle}</span>
                        <AuditStatusPill status={rowStatus(row)} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </OperationsWorkspace>
      )}
    </OperationsPage>
  );
}

function AuditDetailPanel({
  row,
  score,
  status,
}: {
  row: AuditRow;
  score: number;
  status: AuditStatus;
}) {
  const t = useTranslations("audits");
  const locale = useLocale();

  const checklist = [
    {
      id: "gps",
      label: t("detail.checklistItems.gps"),
      ok: row.type !== "gps_missing",
    },
    {
      id: "radius",
      label: t("detail.checklistItems.radius"),
      ok: row.type !== "outside_radius",
    },
    {
      id: "documented",
      label: t("detail.checklistItems.documented"),
      ok: true,
    },
  ];

  const distance =
    row.distance && row.distance < 1000
      ? `${Math.round(row.distance)} m`
      : `${((row.distance ?? 0) / 1000).toFixed(1)} km`;

  const finding =
    row.type === "gps_missing"
      ? t("detail.gpsFinding")
      : t("detail.radiusFinding", { distance });

  const recommendation =
    row.type === "gps_missing"
      ? t("detail.gpsRecommendation")
      : t("detail.radiusRecommendation");

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <div className="space-y-2">
        <DetailSection icon={ListChecks} title={t("detail.checklist")}>
          <ul className="space-y-1">
            {checklist.map((item) => (
              <li
                key={item.id}
                className="flex items-center gap-2 text-[11px] text-muted-foreground"
              >
                {item.ok ? (
                  <CheckCircle2 className="size-3 shrink-0 text-emerald-500" />
                ) : (
                  <AlertTriangle className="size-3 shrink-0 text-destructive" />
                )}
                {item.label}
              </li>
            ))}
          </ul>
        </DetailSection>

        <DetailSection icon={FileText} title={t("detail.notes")}>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            {t("detail.reviewNote", {
              date: new Date(row.checkInAt).toLocaleString(locale),
              employee: row.employee,
              status: t(`statusLabels.${status}`),
              score,
            })}
          </p>
        </DetailSection>

        <DetailSection icon={AlertTriangle} title={t("detail.findings")}>
          <p className="text-[11px] leading-relaxed text-muted-foreground">{finding}</p>
        </DetailSection>
      </div>

      <div className="space-y-2">
        <DetailSection icon={Camera} title={t("detail.photos")}>
          <p className="text-[11px] text-muted-foreground/60">
            {t("detail.noPhotos")}
          </p>
        </DetailSection>

        <DetailSection icon={Lightbulb} title={t("detail.recommendations")}>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            {recommendation}
          </p>
        </DetailSection>

        <DetailSection icon={MapPin} title={t("detail.property")}>
          <p className="text-[11px] text-muted-foreground">{row.addressLabel}</p>
        </DetailSection>
      </div>
    </div>
  );
}

function DetailSection({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-md border border-border/50 bg-background/40 p-2">
      <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        <Icon className="size-3" />
        {title}
      </div>
      {children}
    </div>
  );
}
