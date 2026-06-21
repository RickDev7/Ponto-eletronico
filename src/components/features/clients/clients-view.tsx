"use client";

import { Fragment, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { toast } from "sonner";
import {
  Plus,
  Building2,
  MapPin,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { useForm, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { createClientAction, createAddressAction } from "@/actions/clients/actions";
import {
  createClientSchema,
  createAddressSchema,
  type CreateClientInput,
  type CreateAddressInput,
} from "@/lib/validations/clients";
import { SERVICE_TYPES } from "@/types/enums";
import type { ClientStatus, ServiceType } from "@/types";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  EmptyState,
  OPERATIONS_FORM_CLASS,
  OperationsPage,
  OperationsWorkspace,
  PageHeader,
  StatusBadge,
  type StatusTone,
} from "@/components/shared";
import { AiDomainWidget } from "@/components/features/ai/ai-domain-widget";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { cn } from "@/lib/utils";

interface ClientWithAddresses {
  id: string;
  name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  status: string;
  addresses: Array<{
    id: string;
    street: string;
    house_number: string | null;
    city: string;
    postal_code: string;
    service_types: string[];
    is_active: boolean;
  }>;
}

interface ClientsViewProps {
  slug: string;
  clients: ClientWithAddresses[];
  canWrite: boolean;
}

const AVATAR_TONES = [
  "bg-primary/12 text-primary",
  "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400",
  "bg-violet-500/12 text-violet-600 dark:text-violet-400",
  "bg-amber-500/12 text-amber-600 dark:text-amber-400",
  "bg-sky-500/12 text-sky-600 dark:text-sky-400",
] as const;

const CLIENT_STATUS_TONES: Record<ClientStatus, StatusTone> = {
  active: "success",
  inactive: "neutral",
  archived: "neutral",
};

const TABLE_COLUMNS = 5;

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function avatarTone(name: string) {
  const code = name.charCodeAt(0) + (name.charCodeAt(name.length - 1) ?? 0);
  return AVATAR_TONES[code % AVATAR_TONES.length];
}

function ClientStatusPill({ status }: { status: string }) {
  const tStatus = useTranslations("status");
  const tone = CLIENT_STATUS_TONES[status as ClientStatus] ?? CLIENT_STATUS_TONES.active;
  const statusKey = (status in CLIENT_STATUS_TONES ? status : "active") as ClientStatus;

  return (
    <StatusBadge
      status={tone}
      label={tStatus(statusKey)}
      showDot
      className="h-[18px] gap-1 border-0 bg-muted/40 px-1.5 py-0 text-[10px] font-medium leading-none shadow-none"
    />
  );
}

export function ClientsView({ slug, clients, canWrite }: ClientsViewProps) {
  const t = useTranslations("clients");
  const tCommon = useTranslations("common");
  const tServiceTypes = useTranslations("serviceTypes");

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [clientOpen, setClientOpen] = useState(false);
  const [addressClientId, setAddressClientId] = useState<string | null>(null);

  const activeCount = clients.filter((c) => c.status === "active").length;

  function toggleExpanded(clientId: string) {
    setExpandedId((prev) => (prev === clientId ? null : clientId));
  }

  return (
    <>
      <OperationsPage>
        <PageHeader
          title={t("title")}
          description={t("descriptionWithCount", { count: clients.length, active: activeCount })}
          compact
          actions={
            canWrite ? (
              <Button size="sm" className="h-7" onClick={() => setClientOpen(true)}>
                <Plus />
                {t("create")}
              </Button>
            ) : undefined
          }
        />

        <AiDomainWidget slug={slug} domain="commercial" compact className="mb-2" />

        <OperationsWorkspace className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-border/80 px-2.5 py-0.5">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              {t("sectionLabel")}
            </span>
            <span className="text-[10px] tabular-nums text-muted-foreground">
              {tCommon("entries", { count: clients.length })}
            </span>
          </div>

          {clients.length === 0 ? (
            <EmptyState
              icon={Building2}
              title={t("empty.title")}
              description={t("empty.description")}
              size="sm"
              action={
                canWrite ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7"
                    onClick={() => setClientOpen(true)}
                  >
                    {t("createFirst")}
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border/60 hover:bg-transparent">
                  <TableHead className="min-w-[220px]">{t("columns.client")}</TableHead>
                  <TableHead className="hidden w-40 sm:table-cell">{t("columns.contact")}</TableHead>
                  <TableHead className="hidden w-44 md:table-cell">{t("columns.email")}</TableHead>
                  <TableHead className="w-16 text-right">{t("columns.properties")}</TableHead>
                  <TableHead className="w-24">{t("columns.status")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((client) => {
                  const isExpanded = expandedId === client.id;
                  const initials = getInitials(client.name);
                  const tone = avatarTone(client.name);

                  return (
                    <Fragment key={client.id}>
                      <TableRow
                        className={cn(
                          "group cursor-pointer border-border/50",
                          isExpanded && "bg-muted/20",
                        )}
                        onClick={() => toggleExpanded(client.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            toggleExpanded(client.id);
                          }
                        }}
                        tabIndex={0}
                        role="button"
                        aria-expanded={isExpanded}
                      >
                        <TableCell className="max-w-0 py-1 whitespace-normal">
                          <div className="flex min-w-0 items-center gap-1.5">
                            <span className="shrink-0 text-muted-foreground">
                              {isExpanded ? (
                                <ChevronDown className="size-3" />
                              ) : (
                                <ChevronRight className="size-3" />
                              )}
                            </span>
                            <div
                              className={cn(
                                "flex size-6 shrink-0 items-center justify-center rounded-md text-[10px] font-semibold leading-none",
                                tone,
                              )}
                            >
                              {initials}
                            </div>
                            <div className="min-w-0 flex-1 leading-tight">
                              <div className="flex min-w-0 items-center gap-1">
                                <Link
                                  href={`/${slug}/clients/${client.id}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="truncate text-[12px] font-medium tracking-[-0.01em] transition-colors hover:text-primary"
                                >
                                  {client.name}
                                </Link>
                                <Link
                                  href={`/${slug}/clients/${client.id}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="inline-flex size-5 shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-all hover:bg-muted/50 hover:text-foreground group-hover:opacity-100"
                                  aria-label={t("openDetails")}
                                >
                                  <ExternalLink className="size-3" />
                                </Link>
                              </div>
                              {client.contact_name && (
                                <p className="mt-px truncate text-[10px] text-muted-foreground">
                                  {client.contact_name}
                                </p>
                              )}
                              <p className="mt-px truncate text-[10px] text-muted-foreground sm:hidden">
                                {client.email ?? client.phone ?? tCommon("notAvailable")}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden py-1 sm:table-cell">
                          {client.phone ? (
                            <span className="block truncate text-[11px] tabular-nums text-muted-foreground">
                              {client.phone}
                            </span>
                          ) : (
                            <span className="text-[11px] text-muted-foreground/50">
                              {tCommon("notAvailable")}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="hidden py-1 md:table-cell">
                          {client.email ? (
                            <span className="block truncate text-[11px] text-muted-foreground">
                              {client.email}
                            </span>
                          ) : (
                            <span className="text-[11px] text-muted-foreground/50">
                              {tCommon("notAvailable")}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="py-1 text-right">
                          <span className="text-[11px] font-medium tabular-nums text-muted-foreground">
                            {client.addresses.length}
                          </span>
                        </TableCell>
                        <TableCell className="py-1">
                          <ClientStatusPill status={client.status} />
                        </TableCell>
                      </TableRow>

                      {isExpanded && (
                        <TableRow className="border-border/50 bg-muted/5 hover:bg-muted/5">
                          <TableCell colSpan={TABLE_COLUMNS} className="px-2.5 py-1.5">
                            {client.addresses.length === 0 ? (
                              <p className="text-[11px] text-muted-foreground">
                                {t("noProperties")}
                              </p>
                            ) : (
                              <div className="space-y-0.5">
                                {client.addresses.map((addr) => (
                                  <div
                                    key={addr.id}
                                    className="flex items-start gap-2 rounded-md px-1.5 py-1 text-[11px] transition-colors hover:bg-muted/30"
                                  >
                                    <MapPin className="mt-0.5 size-3 shrink-0 text-muted-foreground/70" />
                                    <div className="min-w-0 flex-1 leading-tight">
                                      <p className="text-foreground/90">
                                        {addr.street} {addr.house_number},{" "}
                                        {addr.postal_code} {addr.city}
                                      </p>
                                      {addr.service_types.length > 0 && (
                                        <p className="mt-px truncate text-[10px] text-muted-foreground">
                                          {addr.service_types
                                            .map((st) =>
                                              tServiceTypes(st as ServiceType),
                                            )
                                            .join(" · ")}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                            {canWrite && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="mt-1 h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setAddressClientId(client.id);
                                }}
                              >
                                <MapPin className="size-3" />
                                {t("addProperty")}
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </OperationsWorkspace>
      </OperationsPage>

      <Dialog open={clientOpen} onOpenChange={setClientOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("dialogs.createClient")}</DialogTitle>
          </DialogHeader>
          <ClientForm slug={slug} onSuccess={() => setClientOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!addressClientId}
        onOpenChange={(o) => !o && setAddressClientId(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("dialogs.addProperty")}</DialogTitle>
          </DialogHeader>
          {addressClientId && (
            <AddressForm
              slug={slug}
              clientId={addressClientId}
              onSuccess={() => setAddressClientId(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function ClientForm({
  slug,
  onSuccess,
}: {
  slug: string;
  onSuccess: () => void;
}) {
  const t = useTranslations("clients");
  const tCommon = useTranslations("common");
  const tForms = useTranslations("forms");

  const form = useForm<CreateClientInput>({
    resolver: zodResolver(createClientSchema),
    defaultValues: { name: "", contactName: "", email: "", phone: "", notes: "" },
  });

  async function onSubmit(values: CreateClientInput) {
    const result = await createClientAction(slug, values);
    if (!result.success) { toast.error(result.error); return; }
    toast.success(t("toasts.created"));
    onSuccess();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className={OPERATIONS_FORM_CLASS}>
        <FormField control={form.control} name="name" render={({ field }) => (
          <FormItem>
            <FormLabel>{t("form.nameRequired")}</FormLabel>
            <FormControl><Input placeholder={t("form.namePlaceholder")} {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="contactName" render={({ field }) => (
          <FormItem>
            <FormLabel>{t("form.contactName")}</FormLabel>
            <FormControl><Input placeholder={t("form.contactNamePlaceholder")} {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <div className="grid grid-cols-2 gap-3">
          <FormField control={form.control} name="email" render={({ field }) => (
            <FormItem>
              <FormLabel>{t("form.email")}</FormLabel>
              <FormControl><Input type="email" placeholder={tForms("placeholders.email")} {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="phone" render={({ field }) => (
            <FormItem>
              <FormLabel>{t("form.phone")}</FormLabel>
              <FormControl><Input placeholder={tForms("placeholders.phone")} {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>
        <FormField control={form.control} name="notes" render={({ field }) => (
          <FormItem>
            <FormLabel>{t("form.notes")}</FormLabel>
            <FormControl><Textarea rows={2} placeholder={t("form.notesPlaceholder")} {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <div className="flex justify-end pt-1">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting && <Loader2 className="animate-spin" />}
            {tCommon("create")}
          </Button>
        </div>
      </form>
    </Form>
  );
}

function AddressForm({
  slug,
  clientId,
  onSuccess,
}: {
  slug: string;
  clientId: string;
  onSuccess: () => void;
}) {
  const t = useTranslations("clients");
  const tProperties = useTranslations("properties");

  const form = useForm<CreateAddressInput>({
    resolver: zodResolver(createAddressSchema),
    defaultValues: {
      clientId,
      label: "",
      street: "",
      houseNumber: "",
      postalCode: "",
      city: "",
      accessNotes: "",
      serviceTypes: [],
    },
  });

  async function onSubmit(values: CreateAddressInput) {
    const result = await createAddressAction(slug, values);
    if (!result.success) { toast.error(result.error); return; }
    toast.success(t("toasts.propertyCreated"));
    onSuccess();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className={OPERATIONS_FORM_CLASS}>
        <FormField control={form.control} name="label" render={({ field }) => (
          <FormItem>
            <FormLabel>{tProperties("form.label")}</FormLabel>
            <FormControl><Input placeholder={tProperties("form.labelPlaceholder")} {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <div className="grid grid-cols-3 gap-3">
          <FormField control={form.control} name="street" render={({ field }) => (
            <FormItem className="col-span-2">
              <FormLabel>{tProperties("form.street")} *</FormLabel>
              <FormControl><Input {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="houseNumber" render={({ field }) => (
            <FormItem>
              <FormLabel>{tProperties("form.houseNumber")}</FormLabel>
              <FormControl><Input {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <FormField control={form.control} name="postalCode" render={({ field }) => (
            <FormItem>
              <FormLabel>{tProperties("form.postalCode")} *</FormLabel>
              <FormControl><Input {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="city" render={({ field }) => (
            <FormItem className="col-span-2">
              <FormLabel>{tProperties("form.city")} *</FormLabel>
              <FormControl><Input {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>
        <ServiceTypesField form={form} />
        <FormField control={form.control} name="accessNotes" render={({ field }) => (
          <FormItem>
            <FormLabel>{t("form.accessNotes")}</FormLabel>
            <FormControl><Textarea rows={2} placeholder={t("form.accessNotesPlaceholder")} {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <div className="flex justify-end pt-1">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting && <Loader2 className="animate-spin" />}
            {t("addProperty")}
          </Button>
        </div>
      </form>
    </Form>
  );
}

function ServiceTypesField({
  form,
}: {
  form: UseFormReturn<CreateAddressInput>;
}) {
  const t = useTranslations("clients");
  const tServiceTypes = useTranslations("serviceTypes");

  return (
    <FormField control={form.control} name="serviceTypes" render={({ field }) => (
      <FormItem>
        <FormLabel>{t("form.services")}</FormLabel>
        <div className="grid grid-cols-2 gap-2">
          {SERVICE_TYPES.map((type) => (
            <label key={type} className="flex items-center gap-2 cursor-pointer p-2 rounded-lg border hover:bg-muted/40 transition-colors">
              <Checkbox
                checked={field.value.includes(type)}
                onCheckedChange={(checked) => {
                  if (checked) {
                    field.onChange([...field.value, type]);
                  } else {
                    field.onChange(field.value.filter((v) => v !== type));
                  }
                }}
              />
              <span className="text-sm">{tServiceTypes(type as ServiceType)}</span>
            </label>
          ))}
        </div>
        <FormMessage />
      </FormItem>
    )} />
  );
}
