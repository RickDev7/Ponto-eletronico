"use client";

import { useMemo, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { ROUTES } from "@/config/constants";
import type { ScheduleTaskRow } from "@/lib/field-execution/field-execution-types";
import type { TaskStatus } from "@/types";
import {
  formatJobTimeRange,
  getJobAddressLine,
  getJobClientName,
  taskStatusToMobileVariant,
} from "@/lib/employee/mobile-job-ui";
import {
  AppScreen,
  AppSectionTitle,
  AppSegmentTabs,
  AppTimeline,
  AppTimelineItem,
} from "@/components/mobile/app";
import { offlineCacheKey } from "@/lib/pwa/offline-cache";
import { usePersistOfflineCache } from "@/hooks/employee/use-persist-offline-cache";
import { useOfflineCacheFallback } from "@/hooks/employee/use-offline-cache-fallback";

type ScheduleTab = "today" | "week" | "month";

const STATUS_COLORS: Record<string, string> = {
  completed: "bg-[var(--mobile-success)]",
  scheduled: "bg-[var(--mobile-primary)]",
  in_progress: "bg-[var(--mobile-warning)]",
  cancelled: "bg-[var(--mobile-danger)]",
  draft: "bg-[var(--mobile-secondary)]",
};

interface EmployeeScheduleTabsViewProps {
  slug: string;
  employeeId: string;
  today: string;
  todayTasks: ScheduleTaskRow[];
  upcomingTasks: ScheduleTaskRow[];
  weekTasks: Array<{ date: string; tasks: ScheduleTaskRow[] }>;
  openCheckIn: { id: string; task_id: string } | null;
  activeTaskId: string | null;
}

function toJobLike(task: ScheduleTaskRow) {
  return {
    id: task.id,
    title: task.title,
    status: task.status,
    scheduled_start: task.scheduled_start,
    scheduled_end: task.scheduled_end,
    scheduled_date: task.scheduled_date,
    service_type: task.service_type,
    address: task.address,
  };
}

function formatTime(task: ScheduleTaskRow) {
  if (task.scheduled_start) return task.scheduled_start.slice(0, 5);
  return "—";
}

function formatDuration(task: ScheduleTaskRow) {
  if (!task.scheduled_start || !task.scheduled_end) return undefined;
  const [sh, sm] = task.scheduled_start.split(":").map(Number);
  const [eh, em] = task.scheduled_end.split(":").map(Number);
  if ([sh, sm, eh, em].some((n) => Number.isNaN(n))) return undefined;
  const mins = Math.max(0, eh * 60 + em - (sh * 60 + sm));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? (m > 0 ? `${h}h ${m}m` : `${h}h`) : `${m}m`;
}

export function EmployeeScheduleTabsView(serverProps: EmployeeScheduleTabsViewProps) {
  const cacheKey = offlineCacheKey("schedule", serverProps.slug, serverProps.employeeId);
  usePersistOfflineCache(cacheKey, serverProps);
  const props = useOfflineCacheFallback(cacheKey, serverProps);
  const t = useTranslations("employee.mobile.schedule");
  const tStatus = useTranslations("status");
  const tService = useTranslations("serviceTypes");
  const locale = useLocale();
  const [tab, setTab] = useState<ScheduleTab>("today");

  const monthTasks = useMemo(() => {
    const monthPrefix = props.today.slice(0, 7);
    const all = [
      ...props.todayTasks,
      ...props.upcomingTasks,
      ...props.weekTasks.flatMap((w) => w.tasks),
    ];
    const seen = new Set<string>();
    return all.filter((task) => {
      if (seen.has(task.id)) return false;
      seen.add(task.id);
      return task.scheduled_date.startsWith(monthPrefix);
    });
  }, [props.today, props.todayTasks, props.upcomingTasks, props.weekTasks]);

  const dateLabel = new Date(`${props.today}T12:00:00`).toLocaleDateString(
    locale === "en" ? "en-US" : "pt-BR",
    { weekday: "long", day: "numeric", month: "long" },
  );

  const tasksForTab = useMemo(() => {
    if (tab === "today") {
      return [...props.todayTasks].sort((a, b) =>
        (a.scheduled_start ?? "").localeCompare(b.scheduled_start ?? ""),
      );
    }
    if (tab === "week") {
      return props.weekTasks.flatMap((d) => d.tasks);
    }
    return monthTasks;
  }, [tab, props.todayTasks, props.weekTasks, monthTasks]);

  return (
    <AppScreen>
      <AppSectionTitle title={t("title")} />
      <p className="-mt-4 text-sm capitalize text-[var(--mobile-secondary)]">{dateLabel}</p>

      <AppSegmentTabs
        value={tab}
        onChange={setTab}
        options={[
          { key: "today", label: t("tabs.today") },
          { key: "week", label: t("tabs.week") },
          { key: "month", label: t("tabs.month") },
        ]}
      />

      {tasksForTab.length === 0 ? (
        <div className="mobile-card py-12 text-center text-sm text-[var(--mobile-secondary)]">
          {t("emptyMonth")}
        </div>
      ) : (
        <AppTimeline>
          {tasksForTab.map((task) => {
            const jobLike = toJobLike(task);
            const addr = getJobAddressLine(jobLike as never);
            return (
              <AppTimelineItem
                key={task.id}
                time={formatTime(task)}
                title={getJobClientName(jobLike as never) ?? task.title}
                subtitle={[
                  task.service_type ? tService(task.service_type) : task.title,
                  addr,
                ]
                  .filter(Boolean)
                  .join(" · ")}
                meta={formatDuration(task)}
                statusColor={STATUS_COLORS[task.status] ?? STATUS_COLORS.scheduled}
                href={ROUTES.mobileService(props.slug, task.id)}
              />
            );
          })}
        </AppTimeline>
      )}
    </AppScreen>
  );
}
