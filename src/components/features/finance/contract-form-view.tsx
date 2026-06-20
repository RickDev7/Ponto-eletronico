"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { createContractAction, updateContractAction } from "@/actions/finance/actions";
import { createContractSchema, type CreateContractInput } from "@/lib/validations/finance";
import { calculateLineTotal, calculateTotals } from "@/lib/finance/utils";
import { ROUTES } from "@/config/constants";
import { ContractPreviewPanel } from "@/components/features/finance/contract-preview-panel";
import { useContractMutations } from "@/hooks/use-contract-mutations";
import {
  OperationsPage,
  OperationsWorkspace,
  PageHeader,
  OPERATIONS_FORM_CLASS,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { cn } from "@/lib/utils";

interface ClientOption {
  id: string;
  name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
}

interface MemberOption {
  id: string;
  full_name: string | null;
}

interface CompanyPreview {
  name: string;
  legal_name: string | null;
  tax_id: string | null;
  email: string | null;
  phone: string | null;
  logo_url: string | null;
}

interface AddressOption {
  id: string;
  client_id: string;
  label: string | null;
  street: string;
  house_number: string | null;
  postal_code: string;
  city: string;
}

function formatAddressLabel(addr: AddressOption) {
  const line = `${addr.street}${addr.house_number ? ` ${addr.house_number}` : ""}, ${addr.postal_code} ${addr.city}`;
  return addr.label ? `${addr.label} — ${line}` : line;
}

interface ContractFormViewProps {
  slug: string;
  locale: string;
  company: CompanyPreview;
  clients: ClientOption[];
  addresses: AddressOption[];
  members: MemberOption[];
  contractId?: string;
  initialValues?: CreateContractInput;
}

const draftKey = (slug: string, contractId?: string) =>
  `feldops-contract-draft-${slug}${contractId ? `-${contractId}` : ""}`;

export function ContractFormView({
  slug,
  locale,
  company,
  clients,
  addresses,
  members,
  contractId,
  initialValues,
}: ContractFormViewProps) {
  const router = useRouter();
  const t = useTranslations("finance");
  const isEdit = Boolean(contractId);
  const [pending, startTransition] = useTransition();
  const [autosaving, setAutosaving] = useState(false);
  const { updateContract } = useContractMutations(slug);

  const defaultValues: CreateContractInput = initialValues ?? {
    clientId: clients[0]?.id ?? "",
    addressId: null,
    clientName: clients[0]?.name ?? "",
    clientCompany: clients[0]?.contact_name ?? "",
    clientEmail: clients[0]?.email ?? "",
    clientPhone: clients[0]?.phone ?? "",
    clientAddress: "",
    title: "",
    serviceDescription: "",
    items: [{ description: "", quantity: 1, unitPriceCents: 0 }],
    frequency: "monthly",
    startDate: new Date().toISOString().slice(0, 10),
    endDate: "",
    taxRate: 19,
    discountCents: 0,
    notes: "",
    autoRenew: true,
    renewalNoticeDays: 30,
    autoGenerateInvoice: true,
    autoSendEmail: false,
    autoGeneratePdf: true,
    paymentReminder: true,
    assignedTo: members[0]?.id ?? null,
    isActive: true,
  };

  const form = useForm<CreateContractInput>({
    resolver: zodResolver(createContractSchema),
    defaultValues,
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const watched = useWatch({ control: form.control });
  const selectedClientId = watched.clientId;

  const clientAddresses = useMemo(
    () => addresses.filter((a) => a.client_id === selectedClientId),
    [addresses, selectedClientId],
  );

  const totals = useMemo(() => {
    const items = (watched.items ?? []).map((item) => ({
      lineTotalCents: calculateLineTotal(
        Number(item?.quantity ?? 0),
        Number(item?.unitPriceCents ?? 0),
        0,
      ),
    }));
    return calculateTotals(items, Number(watched.taxRate ?? 19), Number(watched.discountCents ?? 0));
  }, [watched.items, watched.taxRate, watched.discountCents]);

  const onClientChange = useCallback(
    (clientId: string) => {
      const client = clients.find((c) => c.id === clientId);
      if (!client) return;
      form.setValue("clientName", client.name);
      form.setValue("clientCompany", client.contact_name ?? "");
      form.setValue("clientEmail", client.email ?? "");
      form.setValue("clientPhone", client.phone ?? "");

      const firstAddress = addresses.find((a) => a.client_id === clientId);
      form.setValue("addressId", firstAddress?.id ?? null);
      if (firstAddress) {
        form.setValue("clientAddress", formatAddressLabel(firstAddress));
      }
    },
    [clients, addresses, form],
  );

  const onAddressChange = useCallback(
    (addressId: string) => {
      const addr = addresses.find((a) => a.id === addressId);
      if (addr) {
        form.setValue("clientAddress", formatAddressLabel(addr));
      }
    },
    [addresses, form],
  );

  useEffect(() => {
    if (isEdit) return;
    try {
      const raw = localStorage.getItem(draftKey(slug, contractId));
      if (raw) form.reset(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, [slug, contractId, isEdit, form]);

  useEffect(() => {
    if (isEdit) return;
    const sub = form.watch((values) => {
      setAutosaving(true);
      localStorage.setItem(draftKey(slug, contractId), JSON.stringify(values));
      const timer = setTimeout(() => setAutosaving(false), 600);
      return () => clearTimeout(timer);
    });
    return () => sub.unsubscribe();
  }, [form, slug, contractId, isEdit]);

  function handleSubmit(values: CreateContractInput) {
    startTransition(async () => {
      const result = isEdit
        ? await updateContractAction(slug, contractId!, values)
        : await createContractAction(slug, values);

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      localStorage.removeItem(draftKey(slug, contractId));
      toast.success(isEdit ? t("toast.contractUpdated") : t("toast.contractCreated"));
      router.push(ROUTES.financeContract(slug, result.data.id));
    });
  }

  function handleAutosave() {
    if (!isEdit || !contractId) return;
    const values = form.getValues();
    setAutosaving(true);
    updateContract.mutate(
      { id: contractId, input: values },
      {
        onSettled: () => setAutosaving(false),
      },
    );
  }

  return (
    <OperationsPage>
      <PageHeader
        title={isEdit ? t("contracts.editTitle") : t("contracts.newTitle")}
        description={t("contracts.newDescription")}
        actions={
          autosaving ? (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="size-3 animate-spin" />
              {t("quotes.autosaving")}
            </span>
          ) : null
        }
      />

      <OperationsWorkspace>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="grid gap-6 lg:grid-cols-[1fr_320px]"
          >
            <div className="space-y-6">
              <motion.section
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(OPERATIONS_FORM_CLASS, "space-y-4")}
              >
                <h3 className="text-sm font-semibold">{t("contracts.sections.client")}</h3>
                <FormField
                  control={form.control}
                  name="clientId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("columns.client")}</FormLabel>
                      <FormControl>
                        <select
                          suppressHydrationWarning
                          {...field}
                          onChange={(e) => {
                            field.onChange(e);
                            onClientChange(e.target.value);
                          }}
                          className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                        >
                          {clients.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="addressId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("contracts.form.property")}</FormLabel>
                      <FormControl>
                        <select
                          suppressHydrationWarning
                          value={field.value ?? ""}
                          onChange={(e) => {
                            const value = e.target.value || null;
                            field.onChange(value);
                            if (value) onAddressChange(value);
                          }}
                          className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                        >
                          <option value="">{t("contracts.form.noProperty")}</option>
                          {clientAddresses.map((addr) => (
                            <option key={addr.id} value={addr.id}>
                              {formatAddressLabel(addr)}
                            </option>
                          ))}
                        </select>
                      </FormControl>
                      {clientAddresses.length === 0 && selectedClientId && (
                        <p className="text-xs text-muted-foreground">
                          {t("contracts.form.noPropertiesHint")}
                        </p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="clientName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("form.clientName")}</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="clientCompany"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("columns.company")}</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="clientEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("form.clientEmail")}</FormLabel>
                        <FormControl>
                          <Input type="email" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="clientPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("form.clientPhone")}</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="clientAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("form.clientAddress")}</FormLabel>
                      <FormControl>
                        <Textarea rows={2} {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </motion.section>

              <motion.section
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className={cn(OPERATIONS_FORM_CLASS, "space-y-4")}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">{t("contracts.sections.services")}</h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => append({ description: "", quantity: 1, unitPriceCents: 0 })}
                  >
                    <Plus className="size-3.5" />
                    {t("form.addLine")}
                  </Button>
                </div>
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("columns.service")}</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder={t("contracts.form.titlePlaceholder")} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {fields.map((field, index) => (
                  <div key={field.id} className="grid gap-2 rounded-lg border border-border/60 p-3 sm:grid-cols-[1fr_80px_120px_40px]">
                    <FormField
                      control={form.control}
                      name={`items.${index}.description`}
                      render={({ field: f }) => (
                        <FormItem>
                          <FormLabel className="text-xs">{t("pdf.description")}</FormLabel>
                          <FormControl>
                            <Input {...f} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`items.${index}.quantity`}
                      render={({ field: f }) => (
                        <FormItem>
                          <FormLabel className="text-xs">{t("pdf.quantity")}</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" {...f} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`items.${index}.unitPriceCents`}
                      render={({ field: f }) => (
                        <FormItem>
                          <FormLabel className="text-xs">{t("pdf.unitPrice")}</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              value={((f.value ?? 0) / 100).toFixed(2)}
                              onChange={(e) =>
                                f.onChange(Math.round(Number(e.target.value) * 100))
                              }
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="mt-6"
                      onClick={() => remove(index)}
                      disabled={fields.length <= 1}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))}
              </motion.section>

              <motion.section
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className={cn(OPERATIONS_FORM_CLASS, "space-y-4")}
              >
                <h3 className="text-sm font-semibold">{t("contracts.sections.financial")}</h3>
                <div className="grid gap-3 sm:grid-cols-3">
                  <FormField
                    control={form.control}
                    name="taxRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("form.tax")} (%)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="discountCents"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("form.discount")} (€)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            value={((field.value ?? 0) / 100).toFixed(2)}
                            onChange={(e) =>
                              field.onChange(Math.round(Number(e.target.value) * 100))
                            }
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
                <div className="rounded-lg bg-muted/40 p-3 text-sm">
                  <div className="flex justify-between">
                    <span>{t("form.subtotal")}</span>
                    <span className="tabular-nums">€{(totals.subtotalCents / 100).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span>{t("form.total")}</span>
                    <span className="tabular-nums">€{(totals.totalCents / 100).toFixed(2)}</span>
                  </div>
                </div>
              </motion.section>

              <motion.section
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className={cn(OPERATIONS_FORM_CLASS, "space-y-4")}
              >
                <h3 className="text-sm font-semibold">{t("contracts.sections.recurrence")}</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="frequency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("columns.frequency")}</FormLabel>
                        <FormControl>
                          <select suppressHydrationWarning {...field} className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
                            {(["monthly", "bimonthly", "quarterly", "semiannual", "annual"] as const).map(
                              (f) => (
                                <option key={f} value={f}>
                                  {t(`frequency.${f}`)}
                                </option>
                              ),
                            )}
                          </select>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="assignedTo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("quotes.filters.assignee")}</FormLabel>
                        <FormControl>
                          <select
                            suppressHydrationWarning
                            value={field.value ?? ""}
                            onChange={(e) => field.onChange(e.target.value || null)}
                            className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                          >
                            <option value="">—</option>
                            {members.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.full_name ?? m.id.slice(0, 8)}
                              </option>
                            ))}
                          </select>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("columns.startDate")}</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="endDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("columns.endDate")}</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} value={field.value ?? ""} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="autoRenew"
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-2 space-y-0">
                        <FormControl>
                          <input
                            type="checkbox"
                            checked={field.value}
                            onChange={field.onChange}
                            className="size-4 rounded border"
                          />
                        </FormControl>
                        <FormLabel>{t("contracts.form.autoRenew")}</FormLabel>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="renewalNoticeDays"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("contracts.form.renewalNotice")}</FormLabel>
                        <FormControl>
                          <select
                            suppressHydrationWarning
                            value={field.value}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                            className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                          >
                            {[30, 15, 7].map((d) => (
                              <option key={d} value={d}>
                                {d} {t("contracts.form.days")}
                              </option>
                            ))}
                          </select>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </motion.section>

              <motion.section
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className={cn(OPERATIONS_FORM_CLASS, "space-y-4")}
              >
                <h3 className="text-sm font-semibold">{t("contracts.sections.billing")}</h3>
                {(
                  [
                    ["autoGenerateInvoice", t("contracts.form.autoInvoice")],
                    ["autoSendEmail", t("contracts.form.autoEmail")],
                    ["autoGeneratePdf", t("contracts.form.autoPdf")],
                    ["paymentReminder", t("contracts.form.paymentReminder")],
                  ] as const
                ).map(([name, label]) => (
                  <FormField
                    key={name}
                    control={form.control}
                    name={name}
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-2 space-y-0">
                        <FormControl>
                          <input
                            type="checkbox"
                            checked={field.value}
                            onChange={field.onChange}
                            className="size-4 rounded border"
                          />
                        </FormControl>
                        <FormLabel>{label}</FormLabel>
                      </FormItem>
                    )}
                  />
                ))}
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("form.notes")}</FormLabel>
                      <FormControl>
                        <Textarea rows={3} {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </motion.section>

              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => router.back()}>
                  {t("quotes.back")}
                </Button>
                {isEdit && (
                  <Button type="button" variant="secondary" onClick={handleAutosave}>
                    {t("quotes.save")}
                  </Button>
                )}
                <Button type="submit" disabled={pending}>
                  {pending && <Loader2 className="size-4 animate-spin" />}
                  {t("contracts.save")}
                </Button>
              </div>
            </div>

            <ContractPreviewPanel
              company={{
                name: company.name,
                legalName: company.legal_name,
                taxId: company.tax_id,
                email: company.email,
                phone: company.phone,
                logoUrl: company.logo_url,
              }}
              values={watched}
              totals={totals}
              locale={locale}
            />
          </form>
        </Form>
      </OperationsWorkspace>
    </OperationsPage>
  );
}
