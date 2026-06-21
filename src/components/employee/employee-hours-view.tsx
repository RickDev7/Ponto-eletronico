"use client";

import { useTranslations, useLocale } from "next-intl";
import { Clock, TrendingDown, TrendingUp } from "lucide-react";
import type { EmployeeHoursSummary } from "@/lib/employee/load-employee-hours";
import { formatEntryDate, formatMinutes } from "@/lib/employee/format-hours";
import { cn } from "@/lib/utils";

interface EmployeeHoursViewProps {
  summary: EmployeeHoursSummary;
}

export function EmployeeHoursView({ summary }: EmployeeHoursViewProps) {
  const t = useTranslations("employee.mobile.hours");
  const locale = useLocale();
  const { weekMinutes, weekBalanceMinutes, entries } = summary;

  return (
    <div className="space-y-4 p-4">
      <div>
        <h1 className="text-lg font-semibold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Clock className="size-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t("weekTotal")}</p>
              <p className="text-2xl font-bold tabular-nums">{formatMinutes(weekMinutes, locale)}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex size-10 items-center justify-center rounded-xl",
                weekBalanceMinutes >= 0 ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600",
              )}
            >
              {weekBalanceMinutes >= 0 ? (
                <TrendingUp className="size-5" />
              ) : (
                <TrendingDown className="size-5" />
              )}
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t("weekBalance")}</p>
              <p className="text-2xl font-bold tabular-nums">
                {formatMinutes(weekBalanceMinutes, locale)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="rounded-xl border border-dashed px-4 py-10 text-center">
          <Clock className="mx-auto mb-2 size-8 text-muted-foreground/30" />
          <p className="text-sm font-medium">{t("emptyTitle")}</p>
          <p className="mt-1 text-xs text-muted-foreground">{t("empty")}</p>
        </div>
      ) : (
        <ul className="divide-y rounded-xl border border-border/60 bg-card">
          {entries.map((row) => (
            <li
              key={row.entry_date}
              className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
            >
              <span className="text-muted-foreground">{formatEntryDate(row.entry_date, locale)}</span>
              <div className="text-right">
                <span className="font-medium tabular-nums">{formatMinutes(row.ist_minutes, locale)}</span>
                {row.balance_delta_minutes !== 0 && (
                  <p
                    className={cn(
                      "text-[10px] tabular-nums",
                      row.balance_delta_minutes >= 0 ? "text-emerald-600" : "text-amber-600",
                    )}
                  >
                    {formatMinutes(row.balance_delta_minutes, locale)}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
