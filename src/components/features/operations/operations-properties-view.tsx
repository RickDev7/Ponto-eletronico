"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ChevronRight, MapPin } from "lucide-react";
import { ROUTES } from "@/config/constants";
import { clientNameFromProperty, type PropertyRow } from "@/lib/operations/operations-data";
import {
  EmptyState,
  OperationsPage,
  OperationsWorkspace,
  PageHeader,
  ROW_ACTION_TRIGGER_CLASS,
  StatusBadge,
} from "@/components/shared";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface OperationsPropertiesViewProps {
  slug: string;
  properties: PropertyRow[];
}

const ICON_TONES = [
  "bg-primary/12 text-primary",
  "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400",
  "bg-violet-500/12 text-violet-600 dark:text-violet-400",
] as const;

export function OperationsPropertiesView({ slug, properties }: OperationsPropertiesViewProps) {
  const t = useTranslations("operations.properties");
  const tStatus = useTranslations("status");
  const active = properties.filter((p) => p.is_active);

  return (
    <OperationsPage>
      <PageHeader
        title={t("title")}
        description={t("description", { count: active.length })}
        actions={
          <Link
            href={ROUTES.clients(slug)}
            className="inline-flex h-8 items-center rounded-lg border px-3 text-xs font-medium"
          >
            {t("viewClients")}
          </Link>
        }
      />

      <OperationsWorkspace className="overflow-hidden">
        {active.length === 0 ? (
          <EmptyState icon={MapPin} title={t("empty.title")} description={t("empty.description")} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>{t("columns.property")}</TableHead>
                <TableHead className="hidden sm:table-cell">{t("columns.client")}</TableHead>
                <TableHead className="hidden md:table-cell">{t("columns.type")}</TableHead>
                <TableHead className="hidden lg:table-cell">{t("columns.area")}</TableHead>
                <TableHead>{t("columns.status")}</TableHead>
                <TableHead className="w-7" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {active.map((property, i) => {
                const tone = ICON_TONES[i % ICON_TONES.length];
                const label = property.label ?? property.street;
                return (
                  <TableRow key={property.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className={cn("flex size-6 items-center justify-center rounded-md", tone)}>
                          <MapPin className="size-3" />
                        </div>
                        <div>
                          <Link
                            href={ROUTES.operationsProperty(slug, property.id)}
                            className="text-sm font-medium hover:text-primary"
                          >
                            {label}
                          </Link>
                          <p className="text-xs text-muted-foreground">
                            {property.postal_code} {property.city}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                      {clientNameFromProperty(property)}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      {property.property_type ? t(`types.${property.property_type}`) : "—"}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm tabular-nums">
                      {property.area_sqm ? `${property.area_sqm} m²` : "—"}
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        status={property.is_active ? "success" : "neutral"}
                        label={property.is_active ? tStatus("active") : tStatus("inactive")}
                        showDot
                      />
                    </TableCell>
                    <TableCell>
                      <Link
                        href={ROUTES.operationsProperty(slug, property.id)}
                        className={ROW_ACTION_TRIGGER_CLASS}
                      >
                        <ChevronRight className="size-3.5 text-muted-foreground" />
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </OperationsWorkspace>
    </OperationsPage>
  );
}
