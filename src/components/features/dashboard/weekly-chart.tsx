"use client";

import { cn } from "@/lib/utils";

interface DayData {
  label: string;
  date: string;
  scheduled: number;
  completed: number;
}

interface WeeklyChartProps {
  days: DayData[];
  compact?: boolean;
}

export function WeeklyChart({ days, compact = false }: WeeklyChartProps) {
  const maxVal = Math.max(...days.map((d) => d.scheduled + d.completed), 1);
  const today = new Date().toISOString().split("T")[0];

  const totalScheduled = days.reduce((s, d) => s + d.scheduled, 0);
  const totalCompleted = days.reduce((s, d) => s + d.completed, 0);

  return (
    <div className={cn(compact ? "space-y-1" : "space-y-2")}>
      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="inline-block size-1.5 rounded-sm bg-primary/30" />
          Geplant {totalScheduled}
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block size-1.5 rounded-sm bg-emerald-500" />
          Erledigt {totalCompleted}
        </span>
      </div>

      <div
        className={cn(
          "flex items-end gap-0.5 sm:gap-1",
          compact ? "h-8" : "h-16",
        )}
      >
        {days.map((day) => {
          const isToday = day.date === today;
          const total = day.scheduled + day.completed;
          const barHeight =
            total > 0 ? Math.max((total / maxVal) * 100, 12) : 4;

          return (
            <div key={day.date} className="group flex flex-1 flex-col items-center gap-0.5">
              <div
                className="flex w-full flex-col-reverse overflow-hidden rounded-sm"
                style={{ height: `${barHeight}%`, minHeight: total > 0 ? "0.375rem" : "0.125rem" }}
              >
                {day.completed > 0 && (
                  <div
                    className="w-full bg-emerald-500"
                    style={{
                      height: `${(day.completed / total) * 100}%`,
                    }}
                  />
                )}
                {day.scheduled > 0 && (
                  <div
                    className="w-full bg-primary/25"
                    style={{
                      height: `${(day.scheduled / total) * 100}%`,
                    }}
                  />
                )}
                {total === 0 && <div className="h-full w-full bg-muted/60" />}
              </div>
              <span
                className={cn(
                  "text-[9px] leading-none",
                  isToday ? "font-semibold text-foreground" : "text-muted-foreground",
                )}
              >
                {day.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
