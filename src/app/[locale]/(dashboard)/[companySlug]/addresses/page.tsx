import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, MapPin } from "lucide-react";
import { requireCompanyContext } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { AppShellPage } from "@/components/design-system/app-shell";
import {
  EmptyState,
  OperationsFilterBar,
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
import type { ServiceType } from "@/types";
import { AddressFilters } from "@/components/features/addresses/address-filters";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("properties");
  return { title: t("title") };
}

interface PageProps {
  params: Promise<{ companySlug: string }>;
  searchParams: Promise<{ q?: string; city?: string; service?: string }>;
}

const ICON_TONES = [
  "bg-primary/12 text-primary",
  "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400",
  "bg-violet-500/12 text-violet-600 dark:text-violet-400",
  "bg-amber-500/12 text-amber-600 dark:text-amber-400",
  "bg-sky-500/12 text-sky-600 dark:text-sky-400",
] as const;

function propertyIconTone(key: string) {
  const code = key.charCodeAt(0) + (key.charCodeAt(key.length - 1) ?? 0);
  return ICON_TONES[code % ICON_TONES.length];
}

function PropertyStatusPill({
  isActive,
  activeLabel,
  inactiveLabel,
}: {
  isActive: boolean;
  activeLabel: string;
  inactiveLabel: string;
}) {
  return (
    <StatusBadge
      status={isActive ? "success" : "neutral"}
      label={isActive ? activeLabel : inactiveLabel}
      showDot
      className="h-[18px] gap-1 border-0 bg-muted/40 px-1.5 py-0 text-[10px] font-medium leading-none shadow-none"
    />
  );
}

export default async function AddressesPage({ params, searchParams }: PageProps) {
  const [{ companySlug }, filters] = await Promise.all([params, searchParams]);
  const [t, tStatus, tCommon] = await Promise.all([
    getTranslations("properties"),
    getTranslations("status"),
    getTranslations("common"),
  ]);
  const tServiceTypes = await getTranslations("serviceTypes");
  const ctx = await requireCompanyContext({ slug: companySlug, minRole: "supervisor" });

  const supabase = await createClient();

  let query = supabase
    .from("addresses")
    .select(`*, client:clients(id, name)`, { count: "exact" })
    .eq("company_id", ctx.company.id)
    .eq("is_active", true)
    .order("city");

  if (filters.q) {
    query = query.or(
      `street.ilike.%${filters.q}%,city.ilike.%${filters.q}%,label.ilike.%${filters.q}%`,
    );
  }
  if (filters.city) {
    query = query.ilike("city", filters.city);
  }
  if (filters.service) {
    query = query.contains("service_types", [filters.service]);
  }

  const { data: addresses, count } = await query;

  const { data: allAddresses } = await supabase
    .from("addresses")
    .select("city")
    .eq("company_id", ctx.company.id)
    .eq("is_active", true);

  const cities = [...new Set((allAddresses ?? []).map((a) => a.city))].sort();

  const activeFilterCount = [filters.q, filters.city, filters.service].filter(Boolean).length;
  const total = count ?? addresses?.length ?? 0;

  return (
    <AppShellPage size="fluid" className="space-y-2">
      <OperationsPage>
        <PageHeader
          title={t("title")}
          description={t("descriptionWithCount", { count: total })}
          compact
        />

        <OperationsFilterBar>
          <Suspense fallback={null}>
            <AddressFilters
              cities={cities}
              activeFilterCount={activeFilterCount}
              slug={companySlug}
            />
          </Suspense>
        </OperationsFilterBar>

        <OperationsWorkspace className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-border/80 px-2.5 py-0.5">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              {t("sectionLabel")}
            </span>
            <span className="text-[10px] tabular-nums text-muted-foreground">
              {t("list.entries", { count: total })}
            </span>
          </div>

          {!addresses || addresses.length === 0 ? (
            <EmptyState
              icon={MapPin}
              title={
                activeFilterCount > 0 ? t("empty.filteredTitle") : t("empty.title")
              }
              description={
                activeFilterCount > 0
                  ? t("empty.filteredDescription")
                  : t("empty.description")
              }
              size="sm"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border/60 hover:bg-transparent">
                  <TableHead className="min-w-[220px]">{t("columns.property")}</TableHead>
                  <TableHead className="hidden w-36 sm:table-cell">{t("columns.location")}</TableHead>
                  <TableHead className="hidden w-40 md:table-cell">{t("columns.client")}</TableHead>
                  <TableHead className="hidden lg:table-cell">{t("columns.services")}</TableHead>
                  <TableHead className="w-24">{t("columns.status")}</TableHead>
                  <TableHead className="w-7 px-1" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {addresses.map((addr) => {
                  const client = Array.isArray(addr.client) ? addr.client[0] : addr.client;
                  const services = addr.service_types as string[];
                  const displayKey = addr.label ?? addr.street;
                  const tone = propertyIconTone(displayKey);
                  const streetLine = `${addr.street} ${addr.house_number ?? ""}`.trim();
                  const locationLine = `${addr.postal_code} ${addr.city}`.trim();

                  return (
                    <TableRow key={addr.id} className="group border-border/50">
                      <TableCell className="max-w-0 py-1 whitespace-normal">
                        <div className="flex min-w-0 items-center gap-2">
                          <div
                            className={cn(
                              "flex size-6 shrink-0 items-center justify-center rounded-md",
                              tone,
                            )}
                          >
                            <MapPin className="size-3" />
                          </div>
                          <div className="min-w-0 flex-1 leading-tight">
                            <Link
                              href={`/${companySlug}/addresses/${addr.id}`}
                              className="block min-w-0 transition-colors hover:text-primary"
                            >
                              {addr.label ? (
                                <>
                                  <span className="block truncate text-[12px] font-medium tracking-[-0.01em]">
                                    {addr.label}
                                  </span>
                                  <span className="mt-px block truncate text-[10px] text-muted-foreground">
                                    {streetLine}
                                  </span>
                                </>
                              ) : (
                                <span className="block truncate text-[12px] font-medium tracking-[-0.01em]">
                                  {streetLine}
                                </span>
                              )}
                            </Link>
                            <p className="mt-px truncate text-[10px] text-muted-foreground sm:hidden">
                              {locationLine}
                              {client?.name && (
                                <>
                                  <span className="mx-1 text-border">·</span>
                                  {client.name}
                                </>
                              )}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden py-1 sm:table-cell">
                        <span className="block truncate text-[11px] tabular-nums text-muted-foreground">
                          {locationLine}
                        </span>
                      </TableCell>
                      <TableCell className="hidden py-1 md:table-cell">
                        {client?.name ? (
                          <Link
                            href={`/${companySlug}/clients/${client.id}`}
                            className="block truncate text-[11px] text-muted-foreground transition-colors hover:text-primary"
                          >
                            {client.name}
                          </Link>
                        ) : (
                          <span className="text-[11px] text-muted-foreground/50">
                            {tCommon("notAvailable")}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="hidden py-1 lg:table-cell">
                        {services.length > 0 ? (
                          <span className="block truncate text-[11px] text-muted-foreground">
                            {services
                              .map((st) => tServiceTypes(st as ServiceType) ?? st)
                              .join(" · ")}
                          </span>
                        ) : (
                          <span className="text-[11px] text-muted-foreground/50">
                            {tCommon("notAvailable")}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="py-1">
                        <PropertyStatusPill
                          isActive={addr.is_active}
                          activeLabel={tStatus("active")}
                          inactiveLabel={tStatus("inactive")}
                        />
                      </TableCell>
                      <TableCell className="px-1 py-1">
                        <Link
                          href={`/${companySlug}/addresses/${addr.id}`}
                          className={ROW_ACTION_TRIGGER_CLASS}
                          aria-label={t("list.openDetailsAria")}
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
    </AppShellPage>
  );
}
