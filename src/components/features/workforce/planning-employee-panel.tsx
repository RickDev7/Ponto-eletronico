"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Search } from "lucide-react";
import { ROUTES } from "@/config/constants";
import { formatMinutes } from "@/lib/workforce/planning-data";
import type { EmployeePlanningCard } from "@/lib/workforce/planning-data";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const AVAILABILITY_STYLE: Record<string, string> = {
  available: "bg-emerald-500",
  limited: "bg-amber-500",
  overbooked: "bg-rose-500",
  unavailable: "bg-muted-foreground/40",
};

const WORKLOAD_BAR: Record<string, string> = {
  available: "bg-emerald-500",
  limited: "bg-amber-500",
  overbooked: "bg-rose-500",
  unavailable: "bg-muted-foreground/30",
};

interface PlanningEmployeePanelProps {
  slug: string;
  cards: EmployeePlanningCard[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function PlanningEmployeePanel({
  slug,
  cards,
  selectedId,
  onSelect,
}: PlanningEmployeePanelProps) {
  const t = useTranslations("workforce.planning.employees");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"name" | "workload" | "availability">("name");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = cards;
    if (q) {
      list = list.filter(
        (c) =>
          c.fullName.toLowerCase().includes(q) ||
          (c.jobTitle?.toLowerCase().includes(q) ?? false),
      );
    }
    return [...list].sort((a, b) => {
      if (sort === "workload") return b.workloadPct - a.workloadPct;
      if (sort === "availability") {
        const order = { unavailable: 0, overbooked: 1, limited: 2, available: 3 };
        return order[a.availability] - order[b.availability];
      }
      return a.fullName.localeCompare(b.fullName);
    });
  }, [cards, query, sort]);

  return (
    <div className="flex h-full flex-col rounded-xl border border-border/60 bg-card">
      <div className="border-b border-border/60 px-3 py-2.5">
        <h3 className="text-sm font-semibold">{t("title")}</h3>
        <p className="text-[10px] text-muted-foreground">{t("hint")}</p>
        <div className="relative mt-2">
          <Search className="absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("search")}
            className="h-8 pl-8 text-xs"
          />
        </div>
        <div className="mt-2 flex gap-1">
          {(["name", "workload", "availability"] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setSort(key)}
              className={cn(
                "rounded-md px-2 py-0.5 text-[10px] font-medium",
                sort === key ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted",
              )}
            >
              {t(`sort.${key}`)}
            </button>
          ))}
        </div>
      </div>
      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
        <p className="px-1 text-[10px] text-muted-foreground">
          {t("count", { count: filtered.length })}
        </p>
        {filtered.map((card) => (
          <button
            key={card.id}
            type="button"
            onClick={() => onSelect(card.id)}
            className={cn(
              "w-full rounded-lg border px-3 py-2.5 text-left transition-colors hover:bg-muted/40",
              selectedId === card.id && "border-primary/40 bg-primary/5",
            )}
          >
            <div className="flex items-start gap-2">
              <div className="relative shrink-0">
                <div className="flex size-9 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                  {card.fullName.slice(0, 2).toUpperCase()}
                </div>
                <span
                  className={cn(
                    "absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full ring-2 ring-card",
                    AVAILABILITY_STYLE[card.availability],
                  )}
                />
              </div>
              <div className="min-w-0 flex-1">
                <Link
                  href={ROUTES.workforceEmployee(slug, card.id)}
                  className="truncate text-sm font-medium hover:text-primary"
                  onClick={(e) => e.stopPropagation()}
                >
                  {card.fullName}
                </Link>
                <p className="truncate text-[10px] text-muted-foreground">
                  {card.jobTitle ?? t("noRole")} · {t("contract")} {card.weeklyHours}h
                </p>
                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn("h-full rounded-full", WORKLOAD_BAR[card.availability])}
                    style={{ width: `${Math.min(card.workloadPct, 100)}%` }}
                  />
                </div>
                <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] tabular-nums text-muted-foreground">
                  <span>{t("planned")}: {formatMinutes(card.plannedMinutes)}</span>
                  <span>{t("workload")}: {card.workloadPct}%</span>
                </div>
                <div className="mt-0.5 flex flex-wrap gap-1">
                  {card.onVacationToday && (
                    <span className="rounded-full bg-sky-500/15 px-1.5 py-0.5 text-[9px] text-sky-700 dark:text-sky-400">
                      {t("vacation")}
                    </span>
                  )}
                  {card.onSickToday && (
                    <span className="rounded-full bg-rose-500/15 px-1.5 py-0.5 text-[9px] text-rose-700 dark:text-rose-400">
                      {t("sick")}
                    </span>
                  )}
                  {card.vacationDays > 0 && !card.onVacationToday && (
                    <span className="text-[9px] text-muted-foreground">
                      {t("vacationDays", { count: card.vacationDays })}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
