"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { RefreshCw } from "lucide-react";
import { type RecurrenceRule } from "@/lib/recurring/generator";
import {
  createRecurrenceLabelTranslator,
  formatRecurrenceLabel,
} from "@/lib/recurring/format-label";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

const LOCALE_MAP: Record<string, string> = {
  pt: "pt-BR",
  en: "en-US",
};

const WEEKDAY_OPTIONS = [
  { value: 1, key: "mon" },
  { value: 2, key: "tue" },
  { value: 3, key: "wed" },
  { value: 4, key: "thu" },
  { value: 5, key: "fri" },
  { value: 6, key: "sat" },
  { value: 0, key: "sun" },
] as const;

interface RecurrencePickerProps {
  value: RecurrenceRule | null;
  onChange: (rule: RecurrenceRule | null) => void;
}

export function RecurrencePicker({ value, onChange }: RecurrencePickerProps) {
  const t = useTranslations("tasks");
  const tCalendar = useTranslations("calendar");
  const locale = useLocale();
  const dateLocale = LOCALE_MAP[locale] ?? locale;
  const recurrenceTr = createRecurrenceLabelTranslator(t, tCalendar);

  const [enabled, setEnabled] = useState(!!value);
  const [type, setType] = useState<RecurrenceRule["type"]>(value?.type ?? "weekly");
  const [interval, setInterval] = useState(value?.interval ?? 1);
  const [days, setDays] = useState<number[]>(value?.days ?? [1]);
  const [until, setUntil] = useState(value?.until ?? "");
  const [occurrences, setOccurrences] = useState(value?.occurrences ?? 8);

  function emit(partial?: Partial<RecurrenceRule>) {
    if (!enabled) { onChange(null); return; }
    const rule: RecurrenceRule = {
      type: partial?.type ?? type,
      interval: partial?.interval ?? interval,
      days: (partial?.type ?? type) === "weekly" ? (partial?.days ?? days) : undefined,
      until: partial?.until !== undefined ? partial.until : (until || null),
      occurrences: partial?.occurrences ?? occurrences,
    };
    onChange(rule);
  }

  function toggleEnabled(v: boolean) {
    setEnabled(v);
    if (!v) { onChange(null); return; }
    emit();
  }

  function toggleDay(day: number) {
    const next = days.includes(day) ? days.filter((d) => d !== day) : [...days, day];
    if (next.length === 0) return;
    setDays(next);
    emit({ days: next });
  }

  const intervalUnit =
    type === "daily"
      ? t("recurrence.everyDays")
      : type === "weekly"
        ? t("recurrence.everyWeeks")
        : t("recurrence.everyMonths");

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => toggleEnabled(!enabled)}
        className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors w-full ${
          enabled
            ? "border-primary bg-primary/10 text-primary"
            : "hover:bg-muted text-muted-foreground"
        }`}
      >
        <RefreshCw className="size-3.5" />
        {enabled && value
          ? formatRecurrenceLabel(value, recurrenceTr)
          : t("recurrence.setup")}
      </button>

      {enabled && (
        <div className="rounded-xl border p-4 space-y-4 bg-muted/20">
          <div className="space-y-1.5">
            <Label className="text-xs">{t("recurrence.repeatType")}</Label>
            <div className="grid grid-cols-3 gap-1.5">
              {(["daily", "weekly", "monthly"] as RecurrenceRule["type"][]).map((recurrenceType) => (
                <button
                  key={recurrenceType}
                  type="button"
                  onClick={() => { setType(recurrenceType); emit({ type: recurrenceType }); }}
                  className={`rounded-lg border py-1.5 text-xs font-medium transition-colors ${
                    type === recurrenceType ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted"
                  }`}
                >
                  {t(`recurrence.${recurrenceType}`)}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">
                {t("recurrence.every")} {intervalUnit}
              </Label>
              <Input
                type="number"
                min={1}
                max={52}
                value={interval}
                onChange={(e) => {
                  const v = Math.max(1, parseInt(e.target.value) || 1);
                  setInterval(v);
                  emit({ interval: v });
                }}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("recurrence.occurrences")}</Label>
              <Input
                type="number"
                min={1}
                max={52}
                value={occurrences}
                onChange={(e) => {
                  const v = Math.max(1, parseInt(e.target.value) || 8);
                  setOccurrences(v);
                  emit({ occurrences: v });
                }}
                className="h-8 text-sm"
              />
            </div>
          </div>

          {type === "weekly" && (
            <div className="space-y-1.5">
              <Label className="text-xs">{t("recurrence.weekdays")}</Label>
              <div className="flex gap-1">
                {WEEKDAY_OPTIONS.map((d) => (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => toggleDay(d.value)}
                    className={`flex-1 rounded-md py-1 text-xs font-medium transition-colors border ${
                      days.includes(d.value)
                        ? "border-primary bg-primary text-primary-foreground"
                        : "hover:bg-muted"
                    }`}
                  >
                    {tCalendar(`weekdays.${d.key}`)}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs">{t("recurrence.endDate")}</Label>
            <Input
              type="date"
              value={until}
              onChange={(e) => { setUntil(e.target.value); emit({ until: e.target.value || null }); }}
              className="h-8 text-sm"
            />
          </div>

          {value && (
            <p className="text-xs text-muted-foreground bg-primary/5 rounded-lg px-3 py-2">
              {t("recurrence.preview", {
                count: occurrences,
                label: formatRecurrenceLabel(value, recurrenceTr),
              })}
              {value.until &&
                t("recurrence.until", {
                  date: new Date(value.until + "T12:00:00").toLocaleDateString(dateLocale),
                })}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
