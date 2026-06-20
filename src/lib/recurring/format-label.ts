import type { RecurrenceRule } from "./generator";

export const RECURRENCE_WEEKDAY_KEYS = [
  "sun",
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
] as const;

export type RecurrenceWeekdayKey = (typeof RECURRENCE_WEEKDAY_KEYS)[number];

export interface RecurrenceLabelTranslator {
  dailySingle: string;
  dailyInterval: (interval: number) => string;
  weeklySingle: (daysSuffix: string) => string;
  weeklyInterval: (interval: number) => string;
  monthlySingle: string;
  monthlyInterval: (interval: number) => string;
  weekday: (key: RecurrenceWeekdayKey) => string;
}

/** Build a translator from next-intl `tasks` + `calendar` namespaces. */
export function createRecurrenceLabelTranslator(
  t: (key: "recurrence.dailySingle" | "recurrence.dailyInterval" | "recurrence.weeklySingle" | "recurrence.weeklyInterval" | "recurrence.monthlySingle" | "recurrence.monthlyInterval", values?: Record<string, string | number>) => string,
  tCalendar: (key: `weekdays.${RecurrenceWeekdayKey}`) => string,
): RecurrenceLabelTranslator {
  return {
    dailySingle: t("recurrence.dailySingle"),
    dailyInterval: (interval) => t("recurrence.dailyInterval", { interval }),
    weeklySingle: (days) => t("recurrence.weeklySingle", { days }),
    weeklyInterval: (interval) => t("recurrence.weeklyInterval", { interval }),
    monthlySingle: t("recurrence.monthlySingle"),
    monthlyInterval: (interval) => t("recurrence.monthlyInterval", { interval }),
    weekday: (key) => tCalendar(`weekdays.${key}`),
  };
}

export function formatRecurrenceLabel(
  rule: RecurrenceRule,
  tr: RecurrenceLabelTranslator,
): string {
  if (rule.type === "daily") {
    return rule.interval === 1
      ? tr.dailySingle
      : tr.dailyInterval(rule.interval);
  }
  if (rule.type === "weekly") {
    const dayNames = rule.days?.map((d) => tr.weekday(RECURRENCE_WEEKDAY_KEYS[d]!)).join(", ");
    const daysSuffix = dayNames ? ` (${dayNames})` : "";
    return rule.interval === 1
      ? tr.weeklySingle(daysSuffix)
      : tr.weeklyInterval(rule.interval);
  }
  if (rule.type === "monthly") {
    return rule.interval === 1
      ? tr.monthlySingle
      : tr.monthlyInterval(rule.interval);
  }
  return "";
}
