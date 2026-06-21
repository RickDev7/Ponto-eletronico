"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ROUTES } from "@/config/constants";
import type { TaskStatus } from "@/types";
import {
  OperationsPage,
  OperationsWorkspace,
  PageHeader,
} from "@/components/shared";
import { AiDomainWidget } from "@/components/features/ai/ai-domain-widget";
import { CalendarView } from "@/components/features/calendar/calendar-view";

type SchedulingTask = {
  id: string;
  title: string;
  status: string;
  service_type: string;
  scheduled_date: string;
  scheduled_start: string | null;
  address?: { label: string | null; street: string; city: string } | null;
  assignments?: Array<{
    employee_id: string;
    employee?: { full_name: string | null } | Array<{ full_name: string | null }> | null;
  }>;
};

interface OperationsSchedulingViewProps {
  slug: string;
  tasks: SchedulingTask[];
  view: "day" | "week" | "month";
  mode: "list" | "calendar";
  rangeLabel: string;
  prevHref: string;
  nextHref: string;
  todayHref: string;
  calendar?: {
    year: number;
    month: number;
    today: string;
    calendarTasks: Array<Record<string, unknown>>;
  };
}

const STATUS_COLOR: Record<TaskStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  scheduled: "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300",
  in_progress: "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300",
  completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
  cancelled: "bg-destructive/10 text-destructive",
};

export function OperationsSchedulingView({
  slug,
  tasks,
  view,
  mode,
  rangeLabel,
  prevHref,
  nextHref,
  todayHref,
  calendar,
}: OperationsSchedulingViewProps) {
  const t = useTranslations("operations.scheduling");

  const grouped = tasks.reduce<Record<string, SchedulingTask[]>>((acc, task) => {
    const key = task.scheduled_date;
    acc[key] = acc[key] ?? [];
    acc[key].push(task);
    return acc;
  }, {});

  const dates = Object.keys(grouped).sort();

  return (
    <OperationsPage>
      <PageHeader
        title={t("title")}
        description={rangeLabel}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-lg border p-0.5 text-xs">
              {(["list", "calendar"] as const).map((m) => (
                <Link
                  key={m}
                  href={ROUTES.operationsScheduling(slug, { view, mode: m })}
                  className={`rounded-md px-2.5 py-1 ${mode === m ? "bg-primary text-primary-foreground" : ""}`}
                >
                  {t(`modes.${m}`)}
                </Link>
              ))}
            </div>
            {mode === "list" && (
              <>
                <Link href={prevHref} className="inline-flex size-8 items-center justify-center rounded-lg border">
                  <ChevronLeft className="size-4" />
                </Link>
                <Link href={todayHref} className="rounded-lg border px-3 py-1 text-xs font-medium">
                  {t("today")}
                </Link>
                <Link href={nextHref} className="inline-flex size-8 items-center justify-center rounded-lg border">
                  <ChevronRight className="size-4" />
                </Link>
                <div className="flex rounded-lg border p-0.5 text-xs">
                  {(["day", "week", "month"] as const).map((v) => (
                    <Link
                      key={v}
                      href={ROUTES.operationsScheduling(slug, { view: v, mode })}
                      className={`rounded-md px-2.5 py-1 ${view === v ? "bg-primary text-primary-foreground" : ""}`}
                    >
                      {t(`views.${v}`)}
                    </Link>
                  ))}
                </div>
              </>
            )}
          </div>
        }
      />

      <AiDomainWidget slug={slug} domain="operations" compact className="mb-4" />

      {mode === "calendar" && calendar ? (
        <CalendarView
          slug={slug}
          tasks={calendar.calendarTasks}
          year={calendar.year}
          month={calendar.month}
          today={calendar.today}
        />
      ) : (
      <OperationsWorkspace>
        {dates.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">{t("empty")}</p>
        ) : (
          <div className="divide-y">
            {dates.map((date) => (
              <section key={date} className="p-4">
                <h3 className="mb-3 text-sm font-semibold">{date}</h3>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {grouped[date].map((task) => {
                    const emp = task.assignments?.[0]?.employee;
                    const name = Array.isArray(emp) ? emp[0]?.full_name : emp?.full_name;
                    return (
                      <Link
                        key={task.id}
                        href={ROUTES.task(slug, task.id)}
                        className={`rounded-lg border p-3 transition-opacity hover:opacity-90 ${
                          STATUS_COLOR[task.status as TaskStatus]?.split(" ")[0] ?? ""
                        }`}
                      >
                        <p className="text-sm font-medium">{task.title}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {task.address?.label ?? task.address?.street} · {name ?? t("unassigned")}
                        </p>
                      </Link>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </OperationsWorkspace>
      )}
    </OperationsPage>
  );
}
