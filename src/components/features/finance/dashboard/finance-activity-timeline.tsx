"use client";

import { useTranslations } from "next-intl";
import {
  AlertTriangle,
  FileText,
  HandCoins,
  Receipt,
  ScrollText,
} from "lucide-react";
import type { FinanceActivityItem } from "@/lib/finance/dashboard-data";
import { formatDate } from "@/lib/finance/utils";
import { EmptyState } from "@/components/shared";
import { cn } from "@/lib/utils";

const iconMap = {
  payment: HandCoins,
  contract: ScrollText,
  quote: FileText,
  invoice: Receipt,
  overdue: AlertTriangle,
};

const toneMap = {
  payment: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10",
  contract: "text-blue-600 dark:text-blue-400 bg-blue-500/10",
  quote: "text-violet-600 dark:text-violet-400 bg-violet-500/10",
  invoice: "text-zinc-600 dark:text-zinc-400 bg-zinc-500/10",
  overdue: "text-rose-600 dark:text-rose-400 bg-rose-500/10",
};

interface FinanceActivityTimelineProps {
  items: FinanceActivityItem[];
  locale: string;
}

export function FinanceActivityTimeline({ items, locale }: FinanceActivityTimelineProps) {
  const t = useTranslations("finance.dashboard");

  return (
    <div className="rounded-xl border border-border/60 bg-card p-4">
      <h3 className="mb-3 text-sm font-semibold">{t("activity.title")}</h3>

      {items.length === 0 ? (
        <EmptyState title={t("activity.empty")} />
      ) : (
        <ol className="relative space-y-0 border-l border-border/60 pl-4">
          {items.map((item) => {
            const Icon = iconMap[item.type];
            return (
              <li key={item.id} className="relative pb-4 last:pb-0">
                <span
                  className={cn(
                    "absolute -left-[1.37rem] flex size-6 items-center justify-center rounded-full",
                    toneMap[item.type],
                  )}
                >
                  <Icon className="size-3" />
                </span>
                <p className="text-xs leading-relaxed">
                  {t(item.messageKey as "activity.paymentReceived", item.messageParams)}
                </p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  {formatDate(item.at, locale)}
                </p>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
