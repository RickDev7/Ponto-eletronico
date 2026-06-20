"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { formatMinutes } from "@/lib/workforce/planning-data";
import type { PlanningKpis } from "@/lib/workforce/planning-data";
import { FinanceKpiCard } from "@/components/features/finance/dashboard/finance-kpi-card";

interface PlanningKpiStripProps {
  kpis: PlanningKpis;
  locale: string;
}

export function PlanningKpiStrip({ kpis, locale }: PlanningKpiStripProps) {
  const t = useTranslations("workforce.planning.kpi");

  const cards = [
    { label: t("scheduledToday"), value: String(kpis.scheduledToday), accent: "blue" as const },
    { label: t("openShifts"), value: String(kpis.openShifts), accent: "amber" as const },
    { label: t("missing"), value: String(kpis.missingEmployees), accent: "rose" as const },
    { label: t("vacation"), value: String(kpis.onVacation), accent: "neutral" as const },
    { label: t("sick"), value: String(kpis.onSickLeave), accent: "rose" as const },
    { label: t("unassigned"), value: String(kpis.unassignedTasks), accent: "amber" as const },
    {
      label: t("plannedHours"),
      value: formatMinutes(kpis.plannedHoursMinutes),
      accent: "blue" as const,
    },
    {
      label: t("actualHours"),
      value: formatMinutes(kpis.actualHoursMinutes),
      accent: "emerald" as const,
    },
    { label: t("utilization"), value: `${kpis.utilizationPct}%`, accent: "emerald" as const },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-9"
    >
      {cards.map((c) => (
        <FinanceKpiCard key={c.label} label={c.label} value={c.value} accent={c.accent} />
      ))}
    </motion.div>
  );
}
