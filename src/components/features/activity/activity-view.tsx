"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock,
  Euro,
  FileText,
  ListTodo,
  MapPin,
  MessageSquare,
  PenLine,
  Plus,
  RotateCcw,
  Search,
  ShieldAlert,
  UserPlus,
  Users,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/shared/empty-state";
import { KpiCard } from "@/components/shared/kpi-card";
import { PageHeader } from "@/components/shared/page-header";
import {
  OperationsFilterBar,
  OperationsPage,
  OperationsWorkspace,
  WorkspacePanelBar,
} from "@/components/shared/workspace";
import { cn } from "@/lib/utils";

export type FeedCategory =
  | "all"
  | "tasks"
  | "employees"
  | "clients"
  | "properties"
  | "audits"
  | "financial";

export interface ActivityFeedItem {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  entityLabel: string;
  entityHref: string | null;
  actorName: string;
  createdAt: string;
  metadata: Record<string, unknown> | null;
  category: FeedCategory;
}

export interface ActivityAlert {
  id: string;
  label: string;
  href: string;
  meta?: string;
}

export interface SystemHealthMetrics {
  activeTasks: number;
  openCheckIns: number;
  completionRate: number;
  activeEmployees: number;
}

function buildPageHref(slug: string, page: number) {
  if (page <= 1) return `/${slug}/activity`;
  return `/${slug}/activity?page=${page}`;
}

interface ActivityViewProps {
  slug: string;
  items: ActivityFeedItem[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  alerts: {
    overdue: ActivityAlert[];
    failedAudits: ActivityAlert[];
    schedulingConflicts: ActivityAlert[];
  };
  health: SystemHealthMetrics;
}

type DayGroup = "today" | "yesterday" | "earlier";

const CATEGORY_FILTERS: { id: FeedCategory; icon: LucideIcon }[] = [
  { id: "tasks", icon: ListTodo },
  { id: "employees", icon: Users },
  { id: "clients", icon: Building2 },
  { id: "properties", icon: MapPin },
  { id: "audits", icon: ShieldAlert },
  { id: "financial", icon: Euro },
];

const GROUP_ORDER: DayGroup[] = ["today", "yesterday", "earlier"];

type ActivityTranslate = ReturnType<typeof useTranslations<"activity">>;

interface ActionMeta {
  icon: LucideIcon;
  iconClass: string;
  verb: string;
}

function getDayGroup(iso: string): DayGroup {
  const day = iso.slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  if (day === today) return "today";
  if (day === yesterday) return "yesterday";
  return "earlier";
}

function formatRelative(
  iso: string,
  now: number,
  t: ActivityTranslate,
  locale: string,
): string {
  const diff = now - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return t("relative.justNow");
  if (mins < 60) return t("relative.minutes", { count: mins });
  const hours = Math.floor(mins / 60);
  if (hours < 24) return t("relative.hours", { count: hours });
  const days = Math.floor(hours / 24);
  if (days < 7) return t("relative.days", { count: days });
  return new Date(iso).toLocaleDateString(locale, {
    day: "2-digit",
    month: "2-digit",
  });
}

function formatAbsolute(iso: string, locale: string): string {
  return new Date(iso).toLocaleString(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getActionMeta(item: ActivityFeedItem, t: ActivityTranslate): ActionMeta {
  const meta = item.metadata;
  const to = meta?.to as string | undefined;

  switch (item.action) {
    case "created":
      if (item.entityType === "client") {
        return {
          icon: Building2,
          iconClass: "text-blue-600 bg-blue-500/10",
          verb: t("verbs.createdClient"),
        };
      }
      return {
        icon: Plus,
        iconClass: "text-primary bg-primary/10",
        verb: t("actions.created"),
      };
    case "updated":
      return {
        icon: PenLine,
        iconClass: "text-amber-600 bg-amber-500/10",
        verb: t("actions.updated"),
      };
    case "assigned":
      return {
        icon: UserPlus,
        iconClass: "text-blue-600 bg-blue-500/10",
        verb: t("actions.assigned"),
      };
    case "status_changed":
      if (to === "completed") {
        return {
          icon: CheckCircle2,
          iconClass: "text-emerald-600 bg-emerald-500/10",
          verb: t("verbs.completed"),
        };
      }
      if (to === "cancelled") {
        return {
          icon: XCircle,
          iconClass: "text-destructive bg-destructive/10",
          verb: t("verbs.cancelled"),
        };
      }
      return {
        icon: RotateCcw,
        iconClass: "text-amber-600 bg-amber-500/10",
        verb: t("verbs.statusChanged"),
      };
    case "check_in":
      return {
        icon: Clock,
        iconClass: "text-emerald-600 bg-emerald-500/10",
        verb: t("actions.check_in"),
      };
    case "check_out":
      return {
        icon: CheckCircle2,
        iconClass: "text-emerald-700 bg-emerald-500/10",
        verb: t("actions.check_out"),
      };
    case "comment":
      return {
        icon: MessageSquare,
        iconClass: "text-violet-600 bg-violet-500/10",
        verb: t("verbs.commented"),
      };
    case "photo_uploaded":
      return {
        icon: PenLine,
        iconClass: "text-pink-600 bg-pink-500/10",
        verb: t("actions.photo_uploaded"),
      };
    case "report_generated":
      return {
        icon: FileText,
        iconClass: "text-sky-600 bg-sky-500/10",
        verb: t("actions.report_generated"),
      };
    case "deleted":
      return {
        icon: XCircle,
        iconClass: "text-destructive bg-destructive/10",
        verb: t("actions.deleted"),
      };
    default:
      return {
        icon: Activity,
        iconClass: "text-muted-foreground bg-muted/60",
        verb: item.action.replace(/_/g, " "),
      };
  }
}

function EntityLink({
  item,
  className,
}: {
  item: ActivityFeedItem;
  className?: string;
}) {
  const t = useTranslations("activity");
  const label = item.entityLabel || t("entityFallback");
  if (item.entityHref) {
    return (
      <Link
        href={item.entityHref}
        className={cn(
          "font-medium text-foreground hover:text-primary hover:underline underline-offset-2 transition-colors",
          className,
        )}
      >
        {label}
      </Link>
    );
  }
  return <span className={cn("font-medium text-foreground", className)}>{label}</span>;
}

function FeedRow({ item, now }: { item: ActivityFeedItem; now: number }) {
  const t = useTranslations("activity");
  const locale = useLocale();
  const { icon: Icon, iconClass, verb } = getActionMeta(item, t);
  const meta = item.metadata;

  return (
    <div className="group relative flex gap-3 py-2.5 pl-1 pr-2 transition-colors hover:bg-muted/30">
      <div
        className={cn(
          "relative z-10 mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full ring-4 ring-card/20",
          iconClass,
        )}
      >
        <Icon className="size-3.5" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-[13px] leading-snug">
          <span className="font-medium text-foreground">{item.actorName}</span>{" "}
          <span className="text-muted-foreground">{verb}</span>{" "}
          <EntityLink item={item} />
          {item.action === "status_changed" && meta?.from && meta?.to && (
            <span className="ml-1 text-muted-foreground">
              (
              <span>{String(meta.from)}</span>
              <ArrowRight className="mx-0.5 inline size-3" />
              <span className="font-medium text-foreground">{String(meta.to)}</span>
              )
            </span>
          )}
          {item.action === "comment" && meta?.text && (
            <span className="mt-0.5 block text-[12px] italic text-muted-foreground">
              &ldquo;{String(meta.text).slice(0, 100)}
              {String(meta.text).length > 100 ? "…" : ""}&rdquo;
            </span>
          )}
        </p>
        <time
          dateTime={item.createdAt}
          className="mt-0.5 block text-[11px] text-muted-foreground"
          title={formatAbsolute(item.createdAt, locale)}
        >
          {formatRelative(item.createdAt, now, t, locale)}
        </time>
      </div>
    </div>
  );
}

function AlertList({
  title,
  items,
  emptyLabel,
  tone,
}: {
  title: string;
  items: ActivityAlert[];
  emptyLabel: string;
  tone: "danger" | "warning" | "info";
}) {
  const toneClass = {
    danger: "text-destructive",
    warning: "text-amber-600",
    info: "text-blue-600",
  }[tone];

  return (
    <div className="border-b border-border/50 last:border-b-0">
      <div className="flex items-center justify-between px-2.5 py-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </span>
        {items.length > 0 && (
          <span className={cn("text-[10px] font-semibold tabular-nums", toneClass)}>
            {items.length}
          </span>
        )}
      </div>
      {items.length === 0 ? (
        <p className="px-2.5 pb-2 text-[11px] text-muted-foreground/70">{emptyLabel}</p>
      ) : (
        <ul className="space-y-0.5 px-1.5 pb-2">
          {items.map((alert) => (
            <li key={alert.id}>
              <Link
                href={alert.href}
                className="flex items-start gap-2 rounded-md px-1.5 py-1 text-[11px] transition-colors hover:bg-muted/50"
              >
                <AlertTriangle className={cn("mt-0.5 size-3 shrink-0", toneClass)} />
                <span className="min-w-0 flex-1 leading-snug">
                  <span className="line-clamp-2 text-foreground">{alert.label}</span>
                  {alert.meta && (
                    <span className="mt-0.5 block text-muted-foreground">{alert.meta}</span>
                  )}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ActivityView({
  slug,
  items,
  totalCount,
  currentPage,
  totalPages,
  alerts,
  health,
}: ActivityViewProps) {
  const t = useTranslations("activity");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<FeedCategory>("all");
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      if (category !== "all" && item.category !== category) return false;
      if (!q) return true;
      return (
        item.actorName.toLowerCase().includes(q) ||
        item.entityLabel.toLowerCase().includes(q) ||
        item.action.toLowerCase().includes(q) ||
        item.entityType.toLowerCase().includes(q)
      );
    });
  }, [items, search, category]);

  const grouped = useMemo(() => {
    const map = new Map<DayGroup, ActivityFeedItem[]>();
    GROUP_ORDER.forEach((g) => map.set(g, []));
    filtered.forEach((item) => {
      map.get(getDayGroup(item.createdAt))!.push(item);
    });
    return map;
  }, [filtered]);

  const alertTotal =
    alerts.overdue.length +
    alerts.failedAudits.length +
    alerts.schedulingConflicts.length;

  return (
    <OperationsPage>
      <PageHeader
        compact
        title={
          <span className="inline-flex items-center gap-2">
            {t("title")}
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-1.5 py-0 text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-60" />
                <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
              </span>
              {t("live")}
            </span>
          </span>
        }
        description={t("eventCount", { count: totalCount })}
      />

      <div className="grid grid-cols-1 gap-2 xl:grid-cols-[minmax(0,1fr)_272px]">
        <div className="min-w-0 space-y-2">
          <OperationsFilterBar>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative min-w-0 flex-1 sm:max-w-xs">
                <Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t("searchPlaceholder")}
                  className="h-7 border-border/60 bg-background/80 pl-8 text-[11px]"
                />
              </div>
              <div className="flex flex-wrap gap-1">
                <button
                  type="button"
                  suppressHydrationWarning
                  onClick={() => setCategory("all")}
                  className={cn(
                    "inline-flex h-7 items-center gap-1 rounded-md border px-2 text-[11px] font-medium transition-colors",
                    category === "all"
                      ? "border-foreground/20 bg-foreground text-background"
                      : "border-border/60 text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                  )}
                >
                  {t("categories.all")}
                </button>
                {CATEGORY_FILTERS.map(({ id, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    suppressHydrationWarning
                    onClick={() => setCategory(id)}
                    className={cn(
                      "inline-flex h-7 items-center gap-1 rounded-md border px-2 text-[11px] font-medium transition-colors",
                      category === id
                        ? "border-foreground/20 bg-foreground text-background"
                        : "border-border/60 text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                    )}
                  >
                    <Icon className="size-3 shrink-0 opacity-70" />
                    {t(`categories.${id}`)}
                  </button>
                ))}
              </div>
            </div>
          </OperationsFilterBar>

          <OperationsWorkspace>
            {filtered.length === 0 ? (
              <EmptyState
                icon={Activity}
                title={t("empty.title")}
                description={
                  search || category !== "all"
                    ? t("empty.filtered")
                    : t("empty.description")
                }
                className="py-16"
              />
            ) : (
              <div className="relative px-2 py-1">
                <div className="pointer-events-none absolute bottom-4 left-[18px] top-4 w-px bg-border/80" />

                {GROUP_ORDER.map((group) => {
                  const groupItems = grouped.get(group) ?? [];
                  if (groupItems.length === 0) return null;
                  return (
                    <section key={group} className="mb-1 last:mb-0">
                      <div className="sticky top-0 z-10 -mx-2 bg-card/20 px-3 py-1.5 backdrop-blur-sm">
                        <h2 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          {t(`groups.${group}`)}
                        </h2>
                      </div>
                      <div>
                        {groupItems.map((item) => (
                          <FeedRow key={item.id} item={item} now={now} />
                        ))}
                      </div>
                    </section>
                  );
                })}
              </div>
            )}
          </OperationsWorkspace>

          {totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              buildHref={(page) => buildPageHref(slug, page)}
              className="pt-0.5"
            />
          )}
        </div>

        <aside className="space-y-2">
          <OperationsWorkspace>
            <WorkspacePanelBar icon={AlertTriangle}>
              {t("warningsTitle")}
              {alertTotal > 0 && (
                <span className="ml-1 rounded bg-destructive/10 px-1 text-[9px] font-bold text-destructive">
                  {alertTotal}
                </span>
              )}
            </WorkspacePanelBar>
            <AlertList
              title={t("alerts.overdue")}
              items={alerts.overdue}
              emptyLabel={t("alertEmpty.overdue")}
              tone="danger"
            />
            <AlertList
              title={t("alerts.failedAudits")}
              items={alerts.failedAudits}
              emptyLabel={t("alertEmpty.failedAudits")}
              tone="warning"
            />
            <AlertList
              title={t("alerts.schedulingConflicts")}
              items={alerts.schedulingConflicts}
              emptyLabel={t("alertEmpty.conflicts")}
              tone="info"
            />
          </OperationsWorkspace>

          <OperationsWorkspace>
            <WorkspacePanelBar icon={Activity}>{t("systemStatus")}</WorkspacePanelBar>
            <div className="grid grid-cols-2 gap-px bg-border/50">
              <KpiCard
                variant="strip"
                label={t("health.activeTasks")}
                value={health.activeTasks}
                className="rounded-none border-0 bg-card/20 py-2"
              />
              <KpiCard
                variant="strip"
                label={t("health.openCheckIns")}
                value={health.openCheckIns}
                className="rounded-none border-0 bg-card/20 py-2"
              />
              <KpiCard
                variant="strip"
                label={t("health.completionRate")}
                value={`${health.completionRate}%`}
                className="rounded-none border-0 bg-card/20 py-2"
              />
              <KpiCard
                variant="strip"
                label={t("health.activeEmployees")}
                value={health.activeEmployees}
                className="rounded-none border-0 bg-card/20 py-2"
              />
            </div>
            <div className="border-t border-border/50 px-2.5 py-2">
              <Link
                href={`/${slug}/reports`}
                className="text-[11px] font-medium text-primary hover:underline underline-offset-2"
              >
                {t("openIntelligence")}
              </Link>
            </div>
          </OperationsWorkspace>
        </aside>
      </div>
    </OperationsPage>
  );
}
