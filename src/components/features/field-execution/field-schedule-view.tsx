"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ChevronRight, LogIn, MapPin, Navigation } from "lucide-react";
import { ROUTES } from "@/config/constants";
import { buildMapsRouteUrl } from "@/lib/maps";
import type { ScheduleTaskRow } from "@/lib/field-execution/field-execution-types";
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
  openCheckIn,
  activeTaskId,
  locale,
}: FieldScheduleViewProps) {
  const t = useTranslations("fieldExecution.schedule");
  const dateLocale = locale === "en" ? "en-US" : "pt-BR";

  function TaskCard({ task, highlight }: { task: ScheduleTaskRow; highlight?: boolean }) {
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
          {highlight && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
              <LogIn className="size-3" />
              {t("activeSession")}
            </span>
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
            >
              <Navigation className="size-4" />
            </a>
          )}
          <ChevronRight className="size-5 text-muted-foreground" />
        </div>
      </Link>
    );
  }

  return (
    <div className="space-y-5 pb-24">
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

      {openCheckIn && activeTaskId && (
        <section className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-primary">{t("continue")}</h2>
          {todayTasks
            .filter((t) => t.id === activeTaskId)
            .concat(upcomingTasks.filter((t) => t.id === activeTaskId))
            .slice(0, 1)
            .map((task) => (
              <TaskCard key={task.id} task={task} highlight />
            ))}
        </section>
      )}

      <section className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("today")}</h2>
        {todayTasks.length === 0 ? (
          <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">{t("emptyToday")}</p>
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
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("upcoming")}</h2>
          <div className="space-y-2">
            {upcomingTasks.slice(0, 8).map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
