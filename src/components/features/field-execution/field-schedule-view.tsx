"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ChevronRight, MapPin, Navigation } from "lucide-react";
import { ROUTES } from "@/config/constants";
import { buildMapsRouteUrl } from "@/lib/maps";
import type { ScheduleTaskRow } from "@/lib/field-execution/field-execution-types";
import { AppServiceCard } from "@/components/mobile/app";
import {
  formatJobTimeRange,
  getJobAddressLine,
  getJobClientName,
  getJobMapsUrl,
  getJobPrimaryHref,
  getJobStartHref,
  taskStatusToMobileVariant,
} from "@/lib/employee/mobile-job-ui";
import type { TaskStatus } from "@/types";
import { cn } from "@/lib/utils";

interface FieldScheduleViewProps {
  slug: string;
  today: string;
  todayTasks: ScheduleTaskRow[];
  upcomingTasks: ScheduleTaskRow[];
  weekTasks: Array<{ date: string; tasks: ScheduleTaskRow[] }>;
  openCheckIn: { id: string; task_id: string } | null;
  activeTaskId: string | null;
  locale: string;
  variant?: "field" | "mobile";
  hideHeader?: boolean;
}

function getTaskAddress(task: ScheduleTaskRow) {
  return Array.isArray(task.address) ? task.address[0] : task.address;
}

function formatAddressLine(addr: ReturnType<typeof getTaskAddress>) {
  if (!addr) return null;
  return `${addr.street}${addr.house_number ? ` ${addr.house_number}` : ""}, ${addr.city}`;
}

export function FieldScheduleView({
  slug,
  today,
  todayTasks,
  upcomingTasks,
  weekTasks,
  openCheckIn,
  activeTaskId,
  locale,
  variant = "field",
  hideHeader = false,
}: FieldScheduleViewProps) {
  const t = useTranslations("fieldExecution.schedule");
  const tStatus = useTranslations("status");
  const dateLocale = locale === "en" ? "en-US" : "pt-BR";
  const isMobile = variant === "mobile";

  function MobileTaskCard({ task, highlight }: { task: ScheduleTaskRow; highlight?: boolean }) {
    const isActive = task.id === activeTaskId;
    return (
      <AppServiceCard
        clientName={getJobClientName(task) ?? task.title}
        serviceType={task.title}
        timeRange={formatJobTimeRange(task) ?? "—"}
        address={getJobAddressLine(task) ?? undefined}
        statusLabel={tStatus(task.status as TaskStatus)}
        statusVariant={taskStatusToMobileVariant(task.status)}
        href={getJobPrimaryHref(slug, task.id, {
          isActive,
          hasOpenCheckIn: Boolean(openCheckIn && openCheckIn.task_id === task.id),
        })}
        mapsUrl={getJobMapsUrl(task)}
        onStart={
          task.status !== "completed"
            ? getJobStartHref(slug, task.id, {
                isActive,
                hasOpenCheckIn: Boolean(openCheckIn && openCheckIn.task_id === task.id),
              })
            : undefined
        }
        className={highlight || isActive ? "ring-2 ring-[var(--mobile-primary)]/30" : undefined}
      />
    );
  }

  function DesktopTaskCard({ task, highlight }: { task: ScheduleTaskRow; highlight?: boolean }) {
    const addr = getTaskAddress(task);
    const address = formatAddressLine(addr);
    const mapsUrl = buildMapsRouteUrl(addr);

    return (
      <Link
        href={ROUTES.fieldExecute(slug, task.id)}
        className={cn(
          "flex items-start gap-3 rounded-2xl border p-4 transition-colors active:scale-[0.99]",
          highlight ? "border-primary bg-primary/5" : "border-border bg-card hover:bg-muted/30",
        )}
      >
        <div className="min-w-0 flex-1 space-y-1">
          <p className="font-semibold leading-snug">{task.title}</p>
          {task.scheduled_start && (
            <p className="text-xs text-muted-foreground">
              {task.scheduled_start.slice(0, 5)}
              {task.scheduled_end ? ` – ${task.scheduled_end.slice(0, 5)}` : ""}
            </p>
          )}
          {address && (
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="size-3 shrink-0" />
              <span className="truncate">{address}</span>
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          {mapsUrl && (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex size-9 items-center justify-center rounded-full border bg-background"
              aria-label={t("openNavigation")}
            >
              <Navigation className="size-4" />
            </a>
          )}
          <ChevronRight className="size-5 text-muted-foreground" />
        </div>
      </Link>
    );
  }

  const TaskCard = isMobile ? MobileTaskCard : DesktopTaskCard;

  return (
    <div className={cn("space-y-5", isMobile ? "pb-4" : "pb-24")}>
      {!hideHeader && (
        <header className="space-y-1">
          <h1 className="text-xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">
            {new Date(today + "T12:00:00").toLocaleDateString(dateLocale, {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </p>
        </header>
      )}

      {openCheckIn && activeTaskId && (
        <section className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-primary">{t("continue")}</h2>
          {todayTasks
            .filter((task) => task.id === activeTaskId)
            .concat(upcomingTasks.filter((task) => task.id === activeTaskId))
            .slice(0, 1)
            .map((task) => (
              <TaskCard key={task.id} task={task} highlight />
            ))}
        </section>
      )}

      <section className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("today")}</h2>
        {todayTasks.length === 0 ? (
          <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            {t("emptyToday")}
          </p>
        ) : (
          <div className="space-y-2">
            {todayTasks.map((task) => (
              <TaskCard key={task.id} task={task} highlight={task.id === activeTaskId} />
            ))}
          </div>
        )}
      </section>

      {upcomingTasks.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t("upcoming")}
          </h2>
          <div className="space-y-2">
            {upcomingTasks.slice(0, 8).map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        </section>
      )}

      {weekTasks.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t("thisWeek")}
          </h2>
          {weekTasks.map(({ date, tasks }) => (
            <div key={date} className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                {new Date(date + "T12:00:00").toLocaleDateString(dateLocale, {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                })}
              </p>
              <div className="space-y-2">
                {tasks.map((task) => (
                  <TaskCard key={task.id} task={task} highlight={task.id === activeTaskId} />
                ))}
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
