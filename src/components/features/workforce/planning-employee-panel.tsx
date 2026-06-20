"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ROUTES } from "@/config/constants";
import { formatMinutes } from "@/lib/workforce/planning-data";
import type { EmployeePlanningCard } from "@/lib/workforce/planning-data";
import { cn } from "@/lib/utils";

const AVAILABILITY_STYLE: Record<string, string> = {
  available: "bg-emerald-500",
  limited: "bg-amber-500",
  overbooked: "bg-rose-500",
  unavailable: "bg-muted-foreground/40",
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

  return (
    <div className="rounded-xl border border-border/60 bg-card">
      <div className="border-b border-border/60 px-3 py-2.5">
        <h3 className="text-sm font-semibold">{t("title")}</h3>
        <p className="text-[10px] text-muted-foreground">{t("hint")}</p>
      </div>
      <div className="max-h-[520px] space-y-1 overflow-y-auto p-2">
        {cards.map((card) => (
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
                  {card.jobTitle ?? t("noRole")} · {card.weeklyHours}h/{t("week")}
                </p>
                <div className="mt-1 flex gap-2 text-[10px] tabular-nums text-muted-foreground">
                  <span>{t("planned")}: {formatMinutes(card.plannedMinutes)}</span>
                  <span>{t("actual")}: {formatMinutes(card.actualMinutes)}</span>
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
