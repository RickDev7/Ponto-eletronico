"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Box, Boxes, ChevronRight, Truck } from "lucide-react";
import { ROUTES } from "@/config/constants";
import type { AssetsHubData } from "@/lib/assets/load-assets-hub-data";
import { KpiCard } from "@/components/shared/kpi-card";
import { OperationsPage, PageHeader } from "@/components/shared";
import { cn } from "@/lib/utils";

interface AssetsHubViewProps {
  slug: string;
  data: AssetsHubData;
}

const MODULE_LINKS = [
  { key: "vehicles", href: (s: string) => ROUTES.workforceVehicles(s), icon: Truck },
  { key: "equipment", href: (s: string) => ROUTES.operationsEquipment(s), icon: Box },
  { key: "materials", href: (s: string) => ROUTES.operationsMaterials(s), icon: Boxes },
] as const;

export function AssetsHubView({ slug, data }: AssetsHubViewProps) {
  const t = useTranslations("assets.hub");

  const kpis = [
    { label: t("kpis.vehicles"), value: data.vehicles.total, hint: t("kpis.vehiclesHint", { available: data.vehicles.available }) },
    { label: t("kpis.equipment"), value: data.equipment.total, hint: t("kpis.equipmentHint", { assigned: data.equipment.assigned }) },
    { label: t("kpis.materials"), value: data.materials.total, hint: t("kpis.materialsHint", { low: data.materials.lowStock }) },
    {
      label: t("kpis.alerts"),
      value: data.vehicles.overdueMaintenance + data.equipment.overdueMaintenance + data.materials.outOfStock,
      hint: t("kpis.alertsHint"),
    },
  ];

  return (
    <OperationsPage>
      <PageHeader title={t("title")} description={t("description")} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.label} label={kpi.label} value={String(kpi.value)} hint={kpi.hint} />
        ))}
      </div>

      <section className="mt-6">
        <h2 className="mb-3 text-sm font-semibold">{t("modules")}</h2>
        <div className="grid gap-2 sm:grid-cols-3">
          {MODULE_LINKS.map((mod) => (
            <Link
              key={mod.key}
              href={mod.href(slug)}
              className={cn(
                "group flex items-center justify-between rounded-xl border border-border/60 bg-card p-4 transition-colors hover:border-primary/30 hover:bg-muted/30",
              )}
            >
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-lg bg-muted">
                  <mod.icon className="size-4 text-muted-foreground" />
                </div>
                <span className="text-sm font-medium">{t(`links.${mod.key}`)}</span>
              </div>
              <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </Link>
          ))}
        </div>
      </section>
    </OperationsPage>
  );
}
