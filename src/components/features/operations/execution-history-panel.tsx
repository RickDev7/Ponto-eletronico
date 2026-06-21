"use client";

import { useTranslations } from "next-intl";
import { History } from "lucide-react";
import type { TaskEventRow } from "@/lib/operations/traceable-execution-types";
import { cn } from "@/lib/utils";

interface ExecutionHistoryPanelProps {
  events: TaskEventRow[];
  locale: string;
  title?: string;
  emptyMessage?: string;
  maxHeight?: string;
}

const EVENT_KEYS = [
  "created",
  "status_changed",
  "completed",
  "assigned",
  "check_in",
  "check_out",
  "photo_uploaded",
  "scheduled",
  "approved",
  "invoiced",
] as const;

export function ExecutionHistoryPanel({
  events,
  locale,
  title,
  emptyMessage,
  maxHeight = "max-h-80",
}: ExecutionHistoryPanelProps) {
  const t = useTranslations("operations.history");

  function eventLabel(eventType: string) {
    if (EVENT_KEYS.includes(eventType as (typeof EVENT_KEYS)[number])) {
      return t(`events.${eventType as (typeof EVENT_KEYS)[number]}`);
    }
    return eventType;
  }

  const dateLocale = locale === "en" ? "en-US" : "pt-BR";

  return (
    <section className="overflow-hidden rounded-lg border border-border/60 bg-card">
      <header className="flex items-center gap-1.5 border-b border-border/50 px-3 py-2">
        <History className="size-3.5 text-muted-foreground" />
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {title ?? t("title")}
        </h2>
      </header>
      {events.length === 0 ? (
        <p className="px-3 py-6 text-center text-xs text-muted-foreground">
          {emptyMessage ?? t("empty")}
        </p>
      ) : (
        <ul className={cn("divide-y divide-border/40 overflow-y-auto", maxHeight)}>
          {events.map((ev) => (
            <li key={ev.id} className="flex items-start gap-2.5 px-3 py-2.5 text-xs">
              <span className="mt-1 size-1.5 shrink-0 rounded-full bg-primary" />
              <div className="min-w-0 flex-1">
                <p className="font-medium">{eventLabel(ev.event_type)}</p>
                {ev.message && (
                  <p className="text-muted-foreground">{ev.message}</p>
                )}
                {ev.taskTitle && (
                  <p className="truncate text-[10px] text-muted-foreground">{ev.taskTitle}</p>
                )}
                {ev.creatorName && (
                  <p className="text-[10px] text-muted-foreground">{ev.creatorName}</p>
                )}
              </div>
              <time className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
                {new Date(ev.created_at).toLocaleString(dateLocale, {
                  day: "2-digit",
                  month: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </time>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
