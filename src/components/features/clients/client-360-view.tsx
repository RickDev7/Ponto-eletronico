"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  Building2,
  FileText,
  FolderOpen,
  Mail,
  MapPin,
  Phone,
  Receipt,
  ScrollText,
  Users,
  Wrench,
  ClipboardList,
  FileBarChart,
} from "lucide-react";
import { ROUTES } from "@/config/constants";
import { formatDate, formatMoney } from "@/lib/finance/utils";
import { createAddressAction } from "@/actions/clients/actions";
import {
  createAddressSchema,
  type CreateAddressInput,
} from "@/lib/validations/clients";
import { SERVICE_TYPES } from "@/types/enums";
import type { Client360Data } from "@/lib/clients/client-360-types";
import type { ServiceType } from "@/types";
import {
  OPERATIONS_FORM_CLASS,
  OperationsPage,
  OperationsWorkspace,
  PageHeader,
  StatusBadge,
} from "@/components/shared";
import { FinanceKpiCard } from "@/components/features/finance/dashboard/finance-kpi-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { ClientPortalAccessCard } from "@/components/client-portal/client-portal-access-card";

interface Client360ViewProps {
  slug: string;
  data: Client360Data;
  locale: string;
  canWrite: boolean;
}

type TabKey =
  | "overview"
  | "contacts"
  | "contracts"
  | "properties"
  | "services"
  | "invoices"
  | "reports"
  | "documents";

const TAB_ICONS: Record<TabKey, typeof Users> = {
  overview: Building2,
  contacts: Users,
  contracts: ScrollText,
  properties: MapPin,
  services: Wrench,
  invoices: Receipt,
  reports: FileBarChart,
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

export function Client360View({ slug, data, locale, canWrite }: Client360ViewProps) {
  const t = useTranslations("clients.client360");
  const tClients = useTranslations("clients");
  const tServiceTypes = useTranslations("serviceTypes");
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [propertyOpen, setPropertyOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const { client, kpis } = data;

  const addressForm = useForm<CreateAddressInput>({
    resolver: zodResolver(createAddressSchema),
    defaultValues: {
      clientId: client.id,
      street: "",
      postalCode: "",
      city: "",
      serviceTypes: ["cleaning"],
    },
  });

  function submitProperty(values: CreateAddressInput) {
    startTransition(async () => {
      const result = await createAddressAction(slug, values);
      if (!result.success) toast.error(result.error);
      else {
        toast.success(tClients("toasts.propertyCreated"));
        setPropertyOpen(false);
        addressForm.reset({ clientId: client.id, street: "", postalCode: "", city: "", serviceTypes: ["cleaning"] });
        router.refresh();
      }
    });
  }

  const tabs: Array<{ key: TabKey; count?: number }> = [
    { key: "overview" },
    { key: "contacts", count: data.contacts.length },
    { key: "contracts", count: data.contracts.length },
    { key: "properties", count: data.properties.length },
    { key: "services", count: data.services.length },
    { key: "invoices", count: data.invoices.length },
    { key: "reports", count: data.reports.length },
    { key: "documents", count: data.documents.length },
  ];

  const kpiItems = [
    { id: "properties", value: String(kpis.properties), accent: "blue" as const },
    { id: "contracts", value: String(kpis.activeContracts), accent: "indigo" as const },
    { id: "openInvoices", value: String(kpis.openInvoices), accent: "rose" as const },
    {
      id: "revenue",
      value: formatMoney(kpis.revenueCents, "EUR", locale),
      accent: "emerald" as const,
    },
    { id: "activeTasks", value: String(kpis.activeTasks), accent: "amber" as const },
    { id: "completed", value: String(kpis.completedTasks), accent: "neutral" as const },
  ];

  return (
    <OperationsPage>
      <PageHeader
        title={client.name}
        description={
          [client.contact_name, client.email].filter(Boolean).join(" · ") ||
          t("noContact")
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={ROUTES.clients(slug)}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium"
            >
              <ArrowLeft className="size-3.5" />
              {tClients("title")}
            </Link>
            {canWrite && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs"
                  onClick={() => setPropertyOpen(true)}
                >
                  <MapPin className="size-3.5" />
                  {tClients("addProperty")}
                </Button>
                <Link
                  href={ROUTES.financeContractsNew(slug) + `?clientId=${client.id}`}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium"
                >
                  <FileText className="size-3.5" />
                  {t("actions.contract")}
                </Link>
                <Link
                  href={ROUTES.financeInvoices(slug, { create: "1", clientId: client.id })}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground"
                >
                  <Receipt className="size-3.5" />
                  {t("actions.invoice")}
                </Link>
              </>
            )}
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <StatusBadge
          status={client.status === "active" ? "success" : "neutral"}
          label={tClients(`status.${client.status}`)}
        />
        {client.phone && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Phone className="size-3" />
            {client.phone}
          </span>
        )}
        {client.email && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Mail className="size-3" />
            {client.email}
          </span>
        )}
      </div>

      <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {kpiItems.map((item) => (
          <FinanceKpiCard
            key={item.id}
            label={t(`kpis.${item.id}`)}
            value={item.value}
            accent={item.accent === "indigo" ? "blue" : item.accent}
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
                  <Panel title={t("panels.upcomingTasks")} empty={data.tasks.length === 0 ? t("empty.tasks") : undefined}>
                    {data.tasks.length > 0 && (
                      <ul className="divide-y divide-border/40">
                        {data.tasks
                          .filter((tk) => tk.status !== "completed")
                          .slice(0, 6)
                          .map((tk) => (
                            <li key={tk.id} className="flex items-center justify-between px-3 py-2">
                              <Link href={ROUTES.task(slug, tk.id)} className="text-xs font-medium hover:text-primary">
                                {tk.title}
                              </Link>
                              <span className="text-[10px] text-muted-foreground">
                                {formatDate(tk.scheduled_date, locale)}
                              </span>
                            </li>
                          ))}
                      </ul>
                    )}
                  </Panel>
                  <Panel
                    title={t("panels.financial")}
                    href={ROUTES.financeInvoices(slug, { clientId: client.id })}
                    linkLabel={t("viewAll")}
                  >
                    <dl className="grid gap-2 px-3 py-3 text-xs">
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">{t("kpis.openInvoices")}</dt>
                        <dd className="font-medium tabular-nums">{kpis.openInvoices}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">{t("financial.openBalance")}</dt>
                        <dd className="font-medium tabular-nums">
                          {formatMoney(kpis.openBalanceCents, "EUR", locale)}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">{t("kpis.revenue")}</dt>
                        <dd className="font-medium tabular-nums text-emerald-600">
                          {formatMoney(kpis.revenueCents, "EUR", locale)}
                        </dd>
                      </div>
                    </dl>
                  </Panel>
                </div>
                {canWrite && (
                  <ClientPortalAccessCard
                    slug={slug}
                    clientId={client.id}
                    defaultEmail={client.email}
                  />
                )}
                {client.notes && (
                  <div className="rounded-lg border border-border/60 bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
                    {client.notes}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="contacts" className="mt-0">
                <Panel title={t("tabs.contacts")} empty={data.contacts.length === 0 ? t("empty.contacts") : undefined}>
                  {data.contacts.length > 0 && (
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border/40 text-left text-muted-foreground">
                          <th className="px-3 py-2 font-medium">{tClients("columns.contact")}</th>
                          <th className="px-3 py-2 font-medium">{tClients("form.email")}</th>
                          <th className="px-3 py-2 font-medium">{tClients("form.phone")}</th>
                          <th className="px-3 py-2 font-medium">{t("source")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.contacts.map((c) => (
                          <tr key={c.id} className="border-b border-border/30">
                            <td className="px-3 py-2.5 font-medium">
                              {c.name}
                              {c.isPrimary && (
                                <span className="ml-1 text-[10px] text-muted-foreground">({t("primary")})</span>
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-muted-foreground">{c.email ?? "—"}</td>
                            <td className="px-3 py-2.5 text-muted-foreground">{c.phone ?? "—"}</td>
                            <td className="px-3 py-2.5 text-muted-foreground">{t(`contactSource.${c.source}`)}</td>
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
                          <th className="px-3 py-2 font-medium">{t("columns.status")}</th>
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
                            <td className="px-3 py-2.5 text-muted-foreground">{c.status}</td>
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

              <TabsContent value="properties" className="mt-0">
                <Panel
                  title={t("tabs.properties")}
                  empty={data.properties.length === 0 ? t("empty.properties") : undefined}
                >
                  {data.properties.length > 0 && (
                    <ul className="divide-y divide-border/40">
                      {data.properties.map((p) => (
                        <li key={p.id} className="px-3 py-3">
                          <Link
                            href={ROUTES.operationsProperty(slug, p.id)}
                            className="text-sm font-medium hover:text-primary"
                          >
                            {p.label ?? `${p.street} ${p.house_number ?? ""}`.trim()}
                          </Link>
                          <p className="text-[11px] text-muted-foreground">
                            {p.postal_code} {p.city} · {t("taskCount", { count: p.taskCount })}
                          </p>
                          {p.access_notes && (
                            <p className="mt-1 text-[10px] text-muted-foreground">{p.access_notes}</p>
                          )}
                        </li>
                      ))}
                    </ul>
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
                          <th className="px-3 py-2 font-medium">{t("columns.properties")}</th>
                          <th className="px-3 py-2 font-medium">{t("columns.tasks")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.services.map((s) => (
                          <tr key={s.key} className="border-b border-border/30">
                            <td className="px-3 py-2.5 font-medium">
                              {tServiceTypes(s.key as ServiceType)}
                            </td>
                            <td className="px-3 py-2.5 tabular-nums">{s.propertyCount}</td>
                            <td className="px-3 py-2.5 tabular-nums">{s.taskCount}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </Panel>
              </TabsContent>

              <TabsContent value="invoices" className="mt-0">
                <Panel
                  title={t("tabs.invoices")}
                  href={ROUTES.financeInvoices(slug, { clientId: client.id })}
                  linkLabel={t("viewAll")}
                  empty={data.invoices.length === 0 ? t("empty.invoices") : undefined}
                >
                  {data.invoices.length > 0 && (
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border/40 text-left text-muted-foreground">
                          <th className="px-3 py-2 font-medium">#</th>
                          <th className="px-3 py-2 font-medium">{t("columns.status")}</th>
                          <th className="px-3 py-2 font-medium">{t("columns.value")}</th>
                          <th className="px-3 py-2 font-medium">{t("columns.due")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.invoices.map((inv) => (
                          <tr key={inv.id} className="border-b border-border/30 hover:bg-muted/30">
                            <td className="px-3 py-2.5">
                              <Link
                                href={`/${slug}/finance/invoices/${inv.id}`}
                                className="font-medium hover:text-primary"
                              >
                                {inv.invoice_number}
                              </Link>
                            </td>
                            <td className="px-3 py-2.5 text-muted-foreground">{inv.status}</td>
                            <td className="px-3 py-2.5 tabular-nums">
                              {formatMoney(inv.total_cents, "EUR", locale)}
                            </td>
                            <td className="px-3 py-2.5 text-muted-foreground">
                              {formatDate(inv.due_date, locale)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </Panel>
              </TabsContent>

              <TabsContent value="reports" className="mt-0">
                <Panel title={t("tabs.reports")} empty={data.reports.length === 0 ? t("empty.reports") : undefined}>
                  {data.reports.length > 0 && (
                    <ul className="divide-y divide-border/40">
                      {data.reports.map((r) => (
                        <li key={r.id} className="flex items-center justify-between px-3 py-2.5">
                          <Link href={r.href} className="text-xs font-medium hover:text-primary">
                            {r.title}
                          </Link>
                          <span className="text-[10px] text-muted-foreground">
                            {formatDate(r.date, locale)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </Panel>
              </TabsContent>

              <TabsContent value="documents" className="mt-0">
                <Panel title={t("tabs.documents")} empty={data.documents.length === 0 ? t("empty.documents") : undefined}>
                  {data.documents.length > 0 && (
                    <ul className="divide-y divide-border/40">
                      {data.documents.map((doc) => (
                        <li key={doc.id} className="px-3 py-2.5">
                          <Link href={ROUTES.task(slug, doc.taskId)} className="text-xs font-medium hover:text-primary">
                            {doc.taskTitle}
                          </Link>
                          <p className="text-[10px] text-muted-foreground">
                            {doc.photo_type} · {formatDate(doc.uploaded_at, locale)}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </Panel>
              </TabsContent>
            </div>

            <aside className="space-y-4">
              <Panel title={t("panels.activity")}>
                <ul className="max-h-80 divide-y divide-border/40 overflow-y-auto">
                  {data.activity.map((item) => (
                    <li key={item.id} className="px-3 py-2.5">
                      {item.href ? (
                        <Link href={item.href} className="text-xs font-medium hover:text-primary">
                          {item.label}
                        </Link>
                      ) : (
                        <p className="text-xs font-medium">{item.label}</p>
                      )}
                      <p className="text-[10px] text-muted-foreground">
                        {item.description} · {formatDate(item.createdAt, locale)}
                      </p>
                    </li>
                  ))}
                </ul>
              </Panel>

              {data.sourceLead && (
                <Panel title={t("panels.commercial")}>
                  <div className="space-y-2 px-3 py-3 text-xs">
                    <p className="text-muted-foreground">{t("originLead")}</p>
                    <Link
                      href={ROUTES.crmLead(slug, data.sourceLead.id)}
                      className="font-medium hover:text-primary"
                    >
                      {data.sourceLead.company_name}
                    </Link>
                  </div>
                </Panel>
              )}

              {data.quotes.length > 0 && (
                <Panel title={t("panels.quotes")}>
                  <ul className="divide-y divide-border/40">
                    {data.quotes.slice(0, 5).map((q) => (
                      <li key={q.id} className="flex items-center justify-between px-3 py-2">
                        <Link href={ROUTES.financeQuote(slug, q.id)} className="text-xs hover:text-primary">
                          {q.quote_number}
                        </Link>
                        <span className="text-[10px] tabular-nums text-muted-foreground">
                          {formatMoney(q.total_cents, "EUR", locale)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </Panel>
              )}

              <Panel title={t("panels.quickLinks")}>
                <nav className="divide-y divide-border/40">
                  {[
                    { href: ROUTES.operationsScheduling(slug), label: t("links.scheduling"), icon: ClipboardList },
                    { href: ROUTES.financeContracts(slug), label: t("links.contracts"), icon: ScrollText },
                    { href: ROUTES.reports(slug), label: t("links.reports"), icon: FileBarChart },
                  ].map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="flex items-center gap-2 px-3 py-2.5 text-xs font-medium hover:bg-muted/40"
                    >
                      <link.icon className="size-3.5 text-muted-foreground" />
                      {link.label}
                    </Link>
                  ))}
                </nav>
              </Panel>
            </aside>
          </div>
        </Tabs>
      </OperationsWorkspace>

      <Dialog open={propertyOpen} onOpenChange={setPropertyOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{tClients("dialogs.addProperty")}</DialogTitle>
          </DialogHeader>
          <Form {...addressForm}>
            <form onSubmit={addressForm.handleSubmit(submitProperty)} className={OPERATIONS_FORM_CLASS}>
              <FormField
                control={addressForm.control}
                name="street"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("form.street")}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={addressForm.control}
                  name="postalCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("form.postalCode")}</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={addressForm.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("form.city")}</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={addressForm.control}
                name="serviceTypes"
                render={() => (
                  <FormItem>
                    <FormLabel>{tClients("form.services")}</FormLabel>
                    <div className="flex flex-wrap gap-2">
                      {SERVICE_TYPES.map((st) => (
                        <FormField
                          key={st}
                          control={addressForm.control}
                          name="serviceTypes"
                          render={({ field }) => (
                            <FormItem className="flex items-center gap-1.5 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(st)}
                                  onCheckedChange={(checked) => {
                                    const next = checked
                                      ? [...(field.value ?? []), st]
                                      : (field.value ?? []).filter((v) => v !== st);
                                    field.onChange(next);
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="text-xs font-normal">
                                {tServiceTypes(st)}
                              </FormLabel>
                            </FormItem>
                          )}
                        />
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={addressForm.control}
                name="accessNotes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{tClients("form.accessNotes")}</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={2} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={pending} className="w-full">
                {pending ? "…" : tClients("dialogs.addProperty")}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </OperationsPage>
  );
}
