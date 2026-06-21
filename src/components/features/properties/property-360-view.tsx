"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  ArrowLeft,
  Building2,
  Calendar,
  ClipboardList,
  ExternalLink,
  FileText,
  FolderOpen,
  MapPin,
  Plus,
  Users,
  Wrench,
} from "lucide-react";
import { ROUTES } from "@/config/constants";
import { formatDate, formatMoney } from "@/lib/finance/utils";
import type { Property360Data } from "@/lib/properties/property-360-types";
import type { ServiceType } from "@/types";
import { ExecutionStatusBadge } from "@/components/features/operations/execution-status-badge";
import { resolveExecutionStatus } from "@/lib/operations/operations-data";
import {
  OperationsPage,
  OperationsWorkspace,
  PageHeader,
  StatusBadge,
} from "@/components/shared";
import { FinanceKpiCard } from "@/components/features/finance/dashboard/finance-kpi-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Property360ViewProps {
  slug: string;
  data: Property360Data;
  locale: string;
  canWrite: boolean;
}

type TabKey =
  | "overview"
  | "address"
  | "client"
  | "services"
  | "contracts"
  | "visits"
  | "documents";

const TAB_ICONS: Record<TabKey, typeof MapPin> = {
  overview: Building2,
  address: MapPin,
  client: Users,
  services: Wrench,
  contracts: FileText,
  visits: Calendar,
  documents: FolderOpen,
};

function Panel({
  title,
  href,
  linkLabel,
  children,
  empty,
}: {
  title: string;
  href?: string;
  linkLabel?: string;
  children: React.ReactNode;
  empty?: string;
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-border/60 bg-card">
      <header className="flex items-center justify-between border-b border-border/50 px-3 py-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </h3>
        {href && linkLabel && (
          <Link
            href={href}
            className="text-[11px] font-medium text-muted-foreground hover:text-foreground"
          >
            {linkLabel}
          </Link>
        )}
      </header>
      <div className="p-0">
        {empty ? (
          <p className="px-3 py-8 text-center text-xs text-muted-foreground">{empty}</p>
        ) : (
          children
        )}
      </div>
    </section>
  );
}

export function Property360View({ slug, data, locale, canWrite }: Property360ViewProps) {
  const t = useTranslations("operations.property360");
  const tOps = useTranslations("operations.properties");
  const tServiceTypes = useTranslations("serviceTypes");
  const [activeTab, setActiveTab] = useState<TabKey>("overview");

  const { property, client, kpis } = data;
  const displayName = property.label ?? property.street;
  const fullAddress = `${property.street}${property.house_number ? ` ${property.house_number}` : ""}, ${property.postal_code} ${property.city}`;

  const tabs: Array<{ key: TabKey; count?: number }> = [
    { key: "overview" },
    { key: "address" },
    { key: "client" },
    { key: "services", count: data.services.length },
    { key: "contracts", count: data.contracts.length },
    { key: "visits", count: data.upcomingVisits.length + data.visitHistory.length },
    { key: "documents", count: data.documents.length },
  ];

  const kpiItems = [
    { id: "upcoming", value: String(kpis.upcomingVisits), accent: "blue" as const },
    { id: "completed", value: String(kpis.completedVisits), accent: "emerald" as const },
    { id: "contracts", value: String(kpis.activeContracts), accent: "amber" as const },
    { id: "services", value: String(kpis.serviceCount), accent: "neutral" as const },
    { id: "documents", value: String(kpis.documentCount), accent: "neutral" as const },
    { id: "hours", value: `${kpis.hoursLast90Days}h`, accent: "blue" as const },
  ];

  const newVisitHref = `${ROUTES.tasks(slug)}?address=${property.id}`;

  return (
    <OperationsPage>
      <PageHeader
        title={displayName}
        description={fullAddress}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={ROUTES.operationsProperties(slug)}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium"
            >
              <ArrowLeft className="size-3.5" />
              {t("back")}
            </Link>
            <a
              href={data.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium"
            >
              <ExternalLink className="size-3.5" />
              {t("openMap")}
            </a>
            {canWrite && (
              <Link
                href={newVisitHref}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground"
              >
                <Plus className="size-3.5" />
                {t("newVisit")}
              </Link>
            )}
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <StatusBadge
          status={property.is_active ? "success" : "neutral"}
          label={property.is_active ? t("status.active") : t("status.inactive")}
        />
        {property.property_type && (
          <span className="rounded-md border border-border/60 px-2 py-0.5 text-[11px] text-muted-foreground">
            {tOps(`types.${property.property_type}`)}
          </span>
        )}
        {property.area_sqm != null && (
          <span className="text-[11px] text-muted-foreground">
            {property.area_sqm} m²
          </span>
        )}
        {client && (
          <Link
            href={ROUTES.client(slug, client.id)}
            className="text-[11px] font-medium text-primary hover:underline"
          >
            {client.name}
          </Link>
        )}
      </div>

      <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {kpiItems.map((item) => (
          <FinanceKpiCard
            key={item.id}
            label={t(`kpis.${item.id}`)}
            value={item.value}
            accent={item.accent}
          />
        ))}
      </div>

      <OperationsWorkspace className="overflow-hidden p-0">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabKey)}>
          <div className="overflow-x-auto border-b border-border/80 px-2">
            <TabsList className="h-9 gap-0 bg-transparent p-0">
              {tabs.map(({ key, count }) => {
                const Icon = TAB_ICONS[key];
                return (
                  <TabsTrigger
                    key={key}
                    value={key}
                    className="h-8 rounded-none border-b-2 border-transparent px-3 text-[11px] font-medium text-muted-foreground shadow-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground"
                  >
                    <Icon className="size-3.5" />
                    {t(`tabs.${key}`)}
                    {count !== undefined && count > 0 && (
                      <span className="ml-1 tabular-nums text-muted-foreground">{count}</span>
                    )}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>

          <div className="grid gap-4 p-4 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-2">
              <TabsContent value="overview" className="mt-0 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Panel
                    title={t("panels.upcoming")}
                    empty={data.upcomingVisits.length === 0 ? t("empty.visits") : undefined}
                  >
                    {data.upcomingVisits.length > 0 && (
                      <ul className="divide-y divide-border/40">
                        {data.upcomingVisits.slice(0, 6).map((v) => (
                          <li key={v.id} className="flex items-center justify-between px-3 py-2">
                            <Link href={ROUTES.task(slug, v.id)} className="text-xs font-medium hover:text-primary">
                              {v.title}
                            </Link>
                            <span className="text-[10px] text-muted-foreground">
                              {formatDate(v.scheduled_date, locale)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </Panel>
                  <Panel title={t("panels.operations")}>
                    <dl className="grid gap-2 px-3 py-3 text-xs">
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">{t("kpis.services")}</dt>
                        <dd className="font-medium tabular-nums">{kpis.serviceCount}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">{t("kpis.hours")}</dt>
                        <dd className="font-medium tabular-nums">{kpis.hoursLast90Days}h</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">{t("kpis.contracts")}</dt>
                        <dd className="font-medium tabular-nums">{kpis.activeContracts}</dd>
                      </div>
                    </dl>
                  </Panel>
                </div>
                {property.access_notes && (
                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-xs">
                    <p className="font-medium text-amber-800 dark:text-amber-300">{t("accessNotes")}</p>
                    <p className="mt-1 text-muted-foreground">{property.access_notes}</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="address" className="mt-0">
                <Panel title={t("tabs.address")}>
                  <dl className="grid gap-3 px-4 py-4 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-[11px] text-muted-foreground">{t("fields.label")}</dt>
                      <dd className="font-medium">{property.label ?? "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-[11px] text-muted-foreground">{t("fields.type")}</dt>
                      <dd className="font-medium">
                        {property.property_type ? tOps(`types.${property.property_type}`) : "—"}
                      </dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="text-[11px] text-muted-foreground">{t("fields.street")}</dt>
                      <dd className="font-medium">{fullAddress}</dd>
                    </div>
                    <div>
                      <dt className="text-[11px] text-muted-foreground">{t("fields.country")}</dt>
                      <dd className="font-medium">{property.country}</dd>
                    </div>
                    <div>
                      <dt className="text-[11px] text-muted-foreground">{t("fields.area")}</dt>
                      <dd className="font-medium">
                        {property.area_sqm != null ? `${property.area_sqm} m²` : "—"}
                      </dd>
                    </div>
                    {property.latitude != null && property.longitude != null && (
                      <div className="sm:col-span-2">
                        <dt className="text-[11px] text-muted-foreground">{t("fields.coordinates")}</dt>
                        <dd className="font-mono text-xs">
                          {property.latitude}, {property.longitude}
                        </dd>
                      </div>
                    )}
                  </dl>
                </Panel>
              </TabsContent>

              <TabsContent value="client" className="mt-0">
                <Panel title={t("tabs.client")} empty={!client ? t("empty.client") : undefined}>
                  {client && (
                    <div className="space-y-3 px-4 py-4 text-sm">
                      <div>
                        <Link href={ROUTES.client(slug, client.id)} className="font-semibold hover:text-primary">
                          {client.name}
                        </Link>
                      </div>
                      {client.contact_name && (
                        <p className="text-xs text-muted-foreground">{client.contact_name}</p>
                      )}
                      {client.email && <p className="text-xs">{client.email}</p>}
                      {client.phone && <p className="text-xs">{client.phone}</p>}
                    </div>
                  )}
                </Panel>
              </TabsContent>

              <TabsContent value="services" className="mt-0">
                <Panel title={t("tabs.services")} empty={data.services.length === 0 ? t("empty.services") : undefined}>
                  {data.services.length > 0 && (
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border/40 text-left text-muted-foreground">
                          <th className="px-3 py-2 font-medium">{t("columns.service")}</th>
                          <th className="px-3 py-2 font-medium">{t("columns.source")}</th>
                          <th className="px-3 py-2 font-medium">{t("columns.visits")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.services.map((s) => (
                          <tr key={s.key} className="border-b border-border/30">
                            <td className="px-3 py-2.5 font-medium">
                              {tServiceTypes(s.key as ServiceType)}
                            </td>
                            <td className="px-3 py-2.5 text-muted-foreground">
                              {t(`serviceSource.${s.source}`)}
                            </td>
                            <td className="px-3 py-2.5 tabular-nums">{s.visitCount}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </Panel>
              </TabsContent>

              <TabsContent value="contracts" className="mt-0">
                <Panel
                  title={t("tabs.contracts")}
                  href={ROUTES.financeContracts(slug)}
                  linkLabel={t("viewAll")}
                  empty={data.contracts.length === 0 ? t("empty.contracts") : undefined}
                >
                  {data.contracts.length > 0 && (
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border/40 text-left text-muted-foreground">
                          <th className="px-3 py-2 font-medium">{t("columns.title")}</th>
                          <th className="px-3 py-2 font-medium">{t("columns.frequency")}</th>
                          <th className="px-3 py-2 font-medium">{t("columns.value")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.contracts.map((c) => (
                          <tr key={c.id} className="border-b border-border/30 hover:bg-muted/30">
                            <td className="px-3 py-2.5">
                              <Link href={ROUTES.financeContract(slug, c.id)} className="font-medium hover:text-primary">
                                {c.contract_number ?? c.title}
                              </Link>
                            </td>
                            <td className="px-3 py-2.5 text-muted-foreground">{c.frequency}</td>
                            <td className="px-3 py-2.5 tabular-nums">
                              {c.total_cents != null ? formatMoney(c.total_cents, "EUR", locale) : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </Panel>
              </TabsContent>

              <TabsContent value="visits" className="mt-0 space-y-4">
                <Panel
                  title={t("panels.upcoming")}
                  empty={data.upcomingVisits.length === 0 ? t("empty.upcoming") : undefined}
                >
                  {data.upcomingVisits.length > 0 && (
                    <ul className="divide-y divide-border/40">
                      {data.upcomingVisits.map((v) => (
                        <li key={v.id} className="flex items-center justify-between gap-2 px-3 py-2.5">
                          <Link href={ROUTES.task(slug, v.id)} className="text-xs font-medium hover:text-primary">
                            {v.title}
                          </Link>
                          <span className="text-[10px] text-muted-foreground">
                            {formatDate(v.scheduled_date, locale)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </Panel>
                <Panel title={t("panels.history")}>
                  <ul className="divide-y divide-border/40">
                    {data.visitHistory.slice(0, 15).map((v) => (
                      <li key={v.id} className="flex items-center justify-between gap-2 px-3 py-2.5">
                        <Link href={ROUTES.task(slug, v.id)} className="text-xs font-medium hover:text-primary">
                          {v.title}
                        </Link>
                        <ExecutionStatusBadge
                          status={resolveExecutionStatus({
                            status: v.status,
                            approved_at: v.approved_at,
                            invoice_id: null,
                          })}
                        />
                      </li>
                    ))}
                  </ul>
                </Panel>
                {data.checkIns.length > 0 && (
                  <Panel title={t("panels.checkIns")}>
                    <ul className="divide-y divide-border/40">
                      {data.checkIns.map((ci) => (
                        <li key={ci.id} className="px-3 py-2.5">
                          <Link href={ROUTES.task(slug, ci.taskId)} className="text-xs font-medium hover:text-primary">
                            {ci.taskTitle}
                          </Link>
                          <p className="text-[10px] text-muted-foreground">
                            {ci.employeeName ?? "—"} · {formatDate(ci.check_in_at.slice(0, 10), locale)}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </Panel>
                )}
              </TabsContent>

              <TabsContent value="documents" className="mt-0">
                <Panel title={t("tabs.documents")} empty={data.documents.length === 0 ? t("empty.documents") : undefined}>
                  {data.documents.length > 0 && (
                    <div className="grid gap-2 p-3 sm:grid-cols-2 lg:grid-cols-3">
                      {data.documents.map((doc) => (
                        <div key={doc.id} className="overflow-hidden rounded-lg border border-border/60">
                          {doc.signedUrl ? (
                            <a href={doc.signedUrl} target="_blank" rel="noopener noreferrer">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={doc.signedUrl}
                                alt={doc.taskTitle}
                                className="aspect-video w-full object-cover"
                              />
                            </a>
                          ) : (
                            <div className="flex aspect-video items-center justify-center bg-muted text-xs text-muted-foreground">
                              {doc.photo_type}
                            </div>
                          )}
                          <div className="px-2 py-1.5">
                            <Link href={ROUTES.task(slug, doc.taskId)} className="text-[10px] font-medium hover:text-primary">
                              {doc.taskTitle}
                            </Link>
                            <p className="text-[10px] text-muted-foreground">
                              {formatDate(doc.uploaded_at, locale)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Panel>
              </TabsContent>
            </div>

            <aside className="space-y-4">
              <Panel title={t("panels.quickLinks")}>
                <nav className="divide-y divide-border/40">
                  {client && (
                    <Link
                      href={ROUTES.client(slug, client.id)}
                      className="flex items-center gap-2 px-3 py-2.5 text-xs font-medium hover:bg-muted/40"
                    >
                      <Users className="size-3.5 text-muted-foreground" />
                      {t("links.client360")}
                    </Link>
                  )}
                  <Link
                    href={ROUTES.operationsScheduling(slug)}
                    className="flex items-center gap-2 px-3 py-2.5 text-xs font-medium hover:bg-muted/40"
                  >
                    <Calendar className="size-3.5 text-muted-foreground" />
                    {t("links.scheduling")}
                  </Link>
                  <Link
                    href={ROUTES.operationsServices(slug)}
                    className="flex items-center gap-2 px-3 py-2.5 text-xs font-medium hover:bg-muted/40"
                  >
                    <Wrench className="size-3.5 text-muted-foreground" />
                    {t("links.services")}
                  </Link>
                  <Link
                    href={newVisitHref}
                    className="flex items-center gap-2 px-3 py-2.5 text-xs font-medium hover:bg-muted/40"
                  >
                    <ClipboardList className="size-3.5 text-muted-foreground" />
                    {t("links.newVisit")}
                  </Link>
                </nav>
              </Panel>

              {data.services.length > 0 && (
                <Panel title={t("panels.serviceTypes")}>
                  <ul className="flex flex-wrap gap-1.5 px-3 py-3">
                    {data.services.map((s) => (
                      <li
                        key={s.key}
                        className="rounded-md border border-border/60 px-2 py-0.5 text-[10px] font-medium"
                      >
                        {tServiceTypes(s.key as ServiceType)}
                      </li>
                    ))}
                  </ul>
                </Panel>
              )}
            </aside>
          </div>
        </Tabs>
      </OperationsWorkspace>
    </OperationsPage>
  );
}
