"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/finance/utils";
import type { InvoiceListRow } from "@/lib/finance/invoices-data";
import { parseMonthKey } from "@/lib/finance/utils";

interface InvoicesCalendarViewProps {
  invoices: InvoiceListRow[];
  month: string;
  locale: string;
}

export function InvoicesCalendarView({ invoices, month, locale }: InvoicesCalendarViewProps) {
  const t = useTranslations("finance.invoices.calendar");
  const { year, month: monthNum } = parseMonthKey(month);
  const daysInMonth = new Date(year, monthNum, 0).getDate();
  const firstWeekday = new Date(year, monthNum - 1, 1).getDay();

  const byDueDate = useMemo(() => {
    const map = new Map<string, InvoiceListRow[]>();
    for (const inv of invoices) {
      const key = inv.due_date;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(inv);
    }
    return map;
  }, [invoices]);

  const cells: Array<{ day: number | null; date?: string }> = [];
  for (let i = 0; i < firstWeekday; i++) cells.push({ day: null });
  for (let d = 1; d <= daysInMonth; d++) {
    const date = `${year}-${String(monthNum).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push({ day: d, date });
  }

  return (
    <div className="rounded-xl border border-border/60 bg-card p-4">
      <div className="mb-3 grid grid-cols-7 gap-1 text-center text-[10px] font-medium uppercase text-muted-foreground">
        {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell, i) => {
          if (cell.day === null) return <div key={`e-${i}`} className="min-h-16" />;
          const dayInvoices = cell.date ? byDueDate.get(cell.date) ?? [] : [];
          const total = dayInvoices.reduce((s, inv) => s + inv.total_cents, 0);
          return (
            <div
              key={cell.date}
              className={cn(
                "min-h-16 rounded-lg border border-border/40 p-1.5 text-xs",
                dayInvoices.length > 0 && "bg-muted/30",
              )}
            >
              <span className="font-medium">{cell.day}</span>
              {dayInvoices.length > 0 && (
                <div className="mt-1 space-y-0.5">
                  <p className="truncate text-[10px] text-muted-foreground">
                    {dayInvoices.length} {t("due")}
                  </p>
                  <p className="truncate text-[10px] font-medium tabular-nums">
                    {formatMoney(total, "EUR", locale)}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
