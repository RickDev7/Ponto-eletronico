"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle, CheckCircle2, Clock, Info } from "lucide-react";

interface CheckInRecord {
  check_in_at: string;
  check_out_at: string | null;
}

interface WorkTimeWidgetProps {
  todayCheckIns: CheckInRecord[];
}

const THRESHOLDS = {
  breakAt6h: 6 * 60,
  breakAt9h: 9 * 60,
  maxDaily: 10 * 60,
  normalDay: 8 * 60,
};

function formatMinutes(m: number, t: ReturnType<typeof useTranslations>): string {
  const h = Math.floor(m / 60);
  const min = m % 60;
  if (h > 0) return t("durationHoursMinutes", { hours: h, minutes: min });
  return t("durationMinutes", { minutes: min });
}

export function WorkTimeWidget({ todayCheckIns }: WorkTimeWidgetProps) {
  const t = useTranslations("meWorkTime");
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const totalMinutes = todayCheckIns.reduce((acc, ci) => {
    const end = ci.check_out_at ? new Date(ci.check_out_at).getTime() : now;
    return acc + Math.max(0, Math.floor((end - new Date(ci.check_in_at).getTime()) / 60_000));
  }, 0);

  const hasOpenCheckIn = todayCheckIns.some((ci) => !ci.check_out_at);
  const pct = Math.min(100, Math.round((totalMinutes / THRESHOLDS.maxDaily) * 100));

  const isOver = totalMinutes >= THRESHOLDS.maxDaily;
  const isWarning = totalMinutes >= THRESHOLDS.normalDay;
  const needsBreak6h = totalMinutes >= THRESHOLDS.breakAt6h;
  const needsBreak9h = totalMinutes >= THRESHOLDS.breakAt9h;

  const barColor = isOver
    ? "bg-destructive"
    : isWarning
      ? "bg-amber-500"
      : needsBreak6h
        ? "bg-amber-400"
        : "bg-emerald-500";

  return (
    <div
      className={`rounded-xl border p-4 space-y-3 ${
        isOver
          ? "border-destructive/50 bg-destructive/5"
          : isWarning
            ? "border-amber-300/60 bg-amber-50/50 dark:bg-amber-950/20"
            : ""
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock
            className={`size-4 ${isOver ? "text-destructive" : isWarning ? "text-amber-600" : "text-muted-foreground"}`}
          />
          <span className="text-sm font-semibold">{t("title")}</span>
          {hasOpenCheckIn && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-950/40 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {t("active")}
            </span>
          )}
        </div>
        <span
          className={`text-lg font-bold tabular-nums ${
            isOver ? "text-destructive" : isWarning ? "text-amber-600" : ""
          }`}
        >
          {formatMinutes(totalMinutes, t)}
        </span>
      </div>

      <div className="space-y-1">
        <div className="h-2.5 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${barColor}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="relative h-3">
          {[
            { pct: (THRESHOLDS.breakAt6h / THRESHOLDS.maxDaily) * 100, label: "6h" },
            { pct: (THRESHOLDS.normalDay / THRESHOLDS.maxDaily) * 100, label: "8h" },
          ].map((m) => (
            <div
              key={m.label}
              className="absolute top-0 flex flex-col items-center"
              style={{ left: `${m.pct}%`, transform: "translateX(-50%)" }}
            >
              <div className="w-px h-1.5 bg-muted-foreground/30" />
              <span className="text-[9px] text-muted-foreground/60">{m.label}</span>
            </div>
          ))}
        </div>
      </div>

      {isOver && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2">
          <AlertTriangle className="size-3.5 text-destructive mt-0.5 shrink-0" />
          <p className="text-xs text-destructive font-medium">{t("overDailyLimit")}</p>
        </div>
      )}
      {!isOver && needsBreak9h && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30 px-3 py-2">
          <AlertTriangle className="size-3.5 text-amber-600 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-700 font-medium">{t("break45Required")}</p>
        </div>
      )}
      {!isOver && !needsBreak9h && needsBreak6h && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50/70 dark:bg-amber-950/20 px-3 py-2">
          <Info className="size-3.5 text-amber-500 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-700">{t("break30Suggested")}</p>
        </div>
      )}
      {!needsBreak6h && totalMinutes > 0 && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" />
          {t("timeUntilBreak", {
            time: formatMinutes(THRESHOLDS.breakAt6h - totalMinutes, t),
          })}
        </div>
      )}
    </div>
  );
}
