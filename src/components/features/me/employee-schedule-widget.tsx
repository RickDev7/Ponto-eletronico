"use client";

import { useMemo } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { CalendarDays, ChevronRight, Clock, MapPin } from "lucide-react";
import { ROUTES } from "@/config/constants";
import { cn } from "@/lib/utils";

interface ScheduleTask {
  id: string;
  title: string;
  status: string;
  scheduled_date: string;
  scheduled_start: string | null;
  scheduled_end: string | null;
  address?: {
    street?: string;
    house_number?: string;
    city?: string;
    client?: { name?: string } | Array<{ name?: string }>;
  } | null;
}

interface EmployeeScheduleWidgetProps {
  slug: string;
  today: string;
  todayTasks: ScheduleTask[];
  upcomingTasks: ScheduleTask[];
}

function formatTime(iso: string | null) {
  if (!iso) return null;
  return iso.slice(11, 16);
}

function clientName(task: ScheduleTask) {
  const client = task.address?.client;
  if (!client) return null;
  return Array.isArray(client) ? client[0]?.name : client.name;
}

function addressLine(task: ScheduleTask) {
  const a = task.address;
  if (!a) return null;
  const street = [a.street, a.house_number].filter(Boolean).join(" ");
  return [street, a.city].filter(Boolean).join(", ");
}

export function EmployeeScheduleWidget({
  slug,
  today,
  todayTasks,
  upcomingTasks,
}: EmployeeScheduleWidgetProps) {
  const t = useTranslations("workforce.planning.mobile");
  const locale = useLocale();

  const weekDays = useMemo(() => {
    const base = new Date(today + "T12:00:00");
    const monday = new Date(base);
    monday.setDate(base.getDate() - ((base.getDay() + 6) % 7));
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d.toISOString().slice(0, 10);
    });
  }, [today]);

  const allTasks = useMemo(() => {
    const map = new Map<string, ScheduleTask[]>();
    for (const task of [...todayTasks, ...upcomingTasks]) {
      const list = map.get(task.scheduled_date) ?? [];
      if (!list.some((x) => x.id === task.id)) list.push(task);
      map.set(task.scheduled_date, list);
    }
    return map;
  }, [todayTasks, upcomingTasks]);

  const todayCount = todayTasks.length;

  return (
    <section className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
      <div className="border-b border-border/60 bg-gradient-to-r from-primary/5 to-transparent px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarDays className="size-4 text-primary" />
            <h2 className="text-sm font-semibold">{t("title")}</h2>
          </div>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
            {todayCount} {t("today")}
          </span>
        </div>
        <p className="mt-0.5 text-[11px] text-muted-foreground">{t("subtitle")}</p>
      </div>

      <div className="flex gap-1 overflow-x-auto p-3 pb-2">
        {weekDays.map((date) => {
          const isToday = date === today;
          const count = allTasks.get(date)?.length ?? 0;
          const label = new Date(date + "T12:00:00").toLocaleDateString(locale, {
            weekday: "short",
            day: "numeric",
          });
          return (
            <div
              key={date}
              className={cn(
                "flex min-w-[3rem] flex-col items-center rounded-lg px-2 py-1.5 text-center",
                isToday && "bg-primary text-primary-foreground",
                !isToday && count > 0 && "bg-muted/60",
              )}
            >
              <span className="text-[10px] font-medium uppercase">{label.split(" ")[0]}</span>
              <span className="text-sm font-semibold tabular-nums">{date.slice(8)}</span>
              {count > 0 && (
                <span className={cn("mt-0.5 size-1.5 rounded-full", isToday ? "bg-primary-foreground/80" : "bg-primary")} />
              )}
            </div>
          );
        })}
      </div>

      <div className="space-y-2 px-3 pb-3">
        {(allTasks.get(today) ?? []).length === 0 ? (
          <p className="rounded-lg border border-dashed px-3 py-6 text-center text-xs text-muted-foreground">
            {t("noShiftsToday")}
          </p>
        ) : (
          (allTasks.get(today) ?? []).map((task) => (
            <Link
              key={task.id}
              href={ROUTES.task(slug, task.id)}
              className="flex items-start gap-3 rounded-xl border border-border/50 bg-background p-3 transition-colors hover:border-primary/30 hover:bg-muted/30"
            >
              <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Clock className="size-3.5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{task.title}</p>
                {(formatTime(task.scheduled_start) || clientName(task)) && (
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {[formatTime(task.scheduled_start), formatTime(task.scheduled_end)].filter(Boolean).join(" – ")}
                    {clientName(task) ? ` · ${clientName(task)}` : ""}
                  </p>
                )}
                {addressLine(task) && (
                  <p className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
                    <MapPin className="size-3 shrink-0" />
                    <span className="truncate">{addressLine(task)}</span>
                  </p>
                )}
              </div>
              <ChevronRight className="mt-1 size-4 shrink-0 text-muted-foreground" />
            </Link>
          ))
        )}
      </div>
    </section>
  );
}
