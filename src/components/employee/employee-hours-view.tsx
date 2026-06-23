"use client";

import { useTranslations, useLocale } from "next-intl";
import { Clock, TrendingDown, TrendingUp } from "lucide-react";
import { ROUTES } from "@/config/constants";
import type { EmployeeHoursSummary } from "@/lib/employee/load-employee-hours";
import { formatEntryDate, formatMinutes } from "@/lib/employee/format-hours";
import {
  AppCard,
  AppPageHeader,
  AppScreen,
  AppSummaryGrid,
} from "@/components/mobile/app";
import { cn } from "@/lib/utils";

interface EmployeeHoursViewProps {
  slug: string;
  summary: EmployeeHoursSummary;
}

export function EmployeeHoursView({ slug, summary }: EmployeeHoursViewProps) {
  const t = useTranslations("employee.mobile.hours");
  const locale = useLocale();
  const { weekMinutes, weekBalanceMinutes, entries } = summary;

  return (
    <AppScreen>
      <AppPageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        backHref={ROUTES.mobileProfile(slug)}
      />

      <AppSummaryGrid
        items={[
          {
            label: t("weekTotal"),
            value: formatMinutes(weekMinutes, locale),
            icon: Clock,
          },
          {
            label: t("weekBalance"),
            value: formatMinutes(weekBalanceMinutes, locale),
            icon: weekBalanceMinutes >= 0 ? TrendingUp : TrendingDown,
          },
        ]}
      />

      {entries.length === 0 ? (
        <AppCard className="py-12 text-center">
          <Clock className="mx-auto mb-3 size-12 text-[var(--mobile-secondary)]/40" />
          <p className="font-semibold text-[var(--mobile-text)]">{t("emptyTitle")}</p>
          <p className="mt-1 text-sm text-[var(--mobile-secondary)]">{t("empty")}</p>
        </AppCard>
      ) : (
        <ul className="space-y-3">
          {entries.map((row) => (
            <AppCard key={row.entry_date} className="flex items-center justify-between gap-3 py-4">
              <span className="text-sm text-[var(--mobile-secondary)]">
                {formatEntryDate(row.entry_date, locale)}
              </span>
              <div className="text-right">
                <span className="text-lg font-bold tabular-nums text-[var(--mobile-text)]">
                  {formatMinutes(row.ist_minutes, locale)}
                </span>
                {row.balance_delta_minutes !== 0 && (
                  <p
                    className={cn(
                      "text-xs tabular-nums",
                      row.balance_delta_minutes >= 0
                        ? "text-[var(--mobile-success)]"
                        : "text-[var(--mobile-warning)]",
                    )}
                  >
                    {row.balance_delta_minutes >= 0 ? "+" : ""}
                    {formatMinutes(row.balance_delta_minutes, locale)}
                  </p>
                )}
              </div>
            </AppCard>
          ))}
        </ul>
      )}
    </AppScreen>
  );
}
