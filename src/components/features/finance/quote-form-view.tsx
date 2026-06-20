"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Loader2, Plus, Trash2 } from "lucide-react";
import { createQuoteAction, updateQuoteAction } from "@/actions/finance/actions";
import { createQuoteSchema, type CreateQuoteInput } from "@/lib/validations/finance";
import {
  calculateLineTotal,
  calculateTotals,
} from "@/lib/finance/utils";
import { ROUTES } from "@/config/constants";
import { QuotePreviewPanel } from "@/components/features/finance/quote-preview-panel";
import { useQuoteMutations } from "@/hooks/use-quote-mutations";
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

interface LeadOption {
  id: string;
  company_name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  country: string;
  estimated_value_cents: number;
  notes: string | null;
  owner_id: string | null;
}

interface CompanyPreview {
  name: string;
  legal_name: string | null;
  tax_id: string | null;
  email: string | null;
  phone: string | null;
  logo_url: string | null;
}

interface QuoteFormViewProps {
  slug: string;
  locale: string;
  company: CompanyPreview;
  clients: ClientOption[];
  leads?: LeadOption[];
  members: MemberOption[];
  quoteId?: string;
  initialValues?: CreateQuoteInput;
}

const STEPS = ["client", "items", "summary", "details"] as const;
type Step = (typeof STEPS)[number];

const draftKey = (slug: string, quoteId?: string) =>
  `feldops-quote-draft-${slug}${quoteId ? `-${quoteId}` : ""}`;

export function QuoteFormView({
  slug,
  locale,
  company,
  clients,
  leads = [],
  members,
  quoteId,
  initialValues,
}: QuoteFormViewProps) {
  const router = useRouter();
  const t = useTranslations("finance");
  const isEdit = Boolean(quoteId);
  const [step, setStep] = useState<Step>("client");
  const [pending, startTransition] = useTransition();
  const [autosaving, setAutosaving] = useState(false);
  const { updateQuote } = useQuoteMutations(slug);

  const defaultValues: CreateQuoteInput = initialValues ?? {
    clientId: clients[0]?.id ?? null,
    clientName: clients[0]?.name ?? "",
    clientCompany: clients[0]?.contact_name ?? "",
    clientEmail: clients[0]?.email ?? "",
    clientPhone: clients[0]?.phone ?? "",
    clientAddress: "",
    issueDate: new Date().toISOString().slice(0, 10),
    validUntil: "",
    paymentTerms: "",
    taxRate: 19,
    discountCents: 0,
    notes: "",
    internalNotes: "",
    signatureText: "",
    assignedTo: members[0]?.id ?? null,
    leadId: null,
    items: [{ description: "", quantity: 1, unitPriceCents: 0, discountPercent: 0 }],
  };

  const form = useForm<CreateQuoteInput>({
    resolver: zodResolver(createQuoteSchema),
    defaultValues,
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const watched = useWatch({ control: form.control });

  const preview = useMemo(() => {
    const items = (watched.items ?? []).map((item) => ({
      lineTotalCents: calculateLineTotal(
        Number(item?.quantity ?? 0),
        Number(item?.unitPriceCents ?? 0),
        Number(item?.discountPercent ?? 0),
      ),
    }));
    return calculateTotals(items, Number(watched.taxRate ?? 19), Number(watched.discountCents ?? 0));
  }, [watched]);

  useEffect(() => {
    if (isEdit) return;
    try {
      const raw = localStorage.getItem(draftKey(slug));
      if (raw) form.reset(JSON.parse(raw) as CreateQuoteInput);
    } catch {
      /* ignore */
    }
  }, [slug, isEdit, form]);

  useEffect(() => {
    if (isEdit) return;
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(draftKey(slug), JSON.stringify(form.getValues()));
      } catch {
        /* ignore */
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [watched, slug, isEdit, form]);

  const autosaveEdit = useCallback(async () => {
    if (!quoteId || !isEdit) return;
    setAutosaving(true);
    const result = await updateQuote.mutateAsync({ id: quoteId, input: form.getValues() });
    setAutosaving(false);
    if (!result.success) toast.error(result.error);
  }, [quoteId, isEdit, updateQuote, form]);

  useEffect(() => {
    if (!isEdit || !quoteId) return;
    const timer = setTimeout(() => {
      void autosaveEdit();
    }, 2000);
    return () => clearTimeout(timer);
  }, [watched, isEdit, quoteId, autosaveEdit]);

  function selectLead(leadId: string) {
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) return;
    form.setValue("leadId", leadId);
    form.setValue("clientId", null);
    form.setValue("clientName", lead.contact_name ?? lead.company_name);
    form.setValue("clientCompany", lead.company_name);
    form.setValue("clientEmail", lead.email ?? "");
    form.setValue("clientPhone", lead.phone ?? "");
    form.setValue("clientAddress", [lead.city, lead.country].filter(Boolean).join(", "));
    if (lead.owner_id) form.setValue("assignedTo", lead.owner_id);
    if (lead.notes) form.setValue("internalNotes", lead.notes);
    if (lead.estimated_value_cents > 0) {
      form.setValue("items.0.unitPriceCents", lead.estimated_value_cents);
      form.setValue("items.0.description", `Serviço — ${lead.company_name}`);
    }
  }

  function selectClient(clientId: string) {
    const client = clients.find((c) => c.id === clientId);
    if (!client) return;
    form.setValue("clientId", clientId);
    form.setValue("clientName", client.name);
    form.setValue("clientCompany", client.contact_name ?? "");
    form.setValue("clientEmail", client.email ?? "");
    form.setValue("clientPhone", client.phone ?? "");
    form.setValue("clientAddress", "");
  }

  function onSubmit(values: CreateQuoteInput) {
    startTransition(async () => {
      const result = isEdit && quoteId
        ? await updateQuoteAction(slug, quoteId, values)
        : await createQuoteAction(slug, values);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      if (!isEdit) localStorage.removeItem(draftKey(slug));
      toast.success(isEdit ? t("toast.quoteUpdated") : t("toast.quoteCreated"));
      router.push(ROUTES.financeQuote(slug, result.data!.id));
      router.refresh();
    });
  }

  const stepIndex = STEPS.indexOf(step);

  return (
    <OperationsPage>
      <PageHeader
        title={isEdit ? t("quotes.editTitle") : t("quotes.newTitle")}
        description={t("quotes.newDescription")}
        actions={
          isEdit && autosaving ? (
            <span className="text-xs text-muted-foreground">{t("quotes.autosaving")}</span>
          ) : undefined
        }
      />

      <div className="mb-4 flex gap-1 overflow-x-auto rounded-lg border border-border/60 bg-muted/20 p-1">
        {STEPS.map((s, i) => (
          <button
            key={s}
            type="button"
            suppressHydrationWarning
            onClick={() => setStep(s)}
            className={cn(
              "flex-1 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              step === s
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {i + 1}. {t(`quotes.steps.${s}`)}
          </button>
        ))}
      </div>

      <OperationsWorkspace>
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className={OPERATIONS_FORM_CLASS}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.2 }}
                >
                  {step === "client" && (
                    <section className="space-y-4 rounded-xl border border-border/60 bg-card p-4">
                      <h3 className="text-sm font-semibold">{t("form.clientSection")}</h3>
                      {leads.length > 0 && (
                        <FormField
                          control={form.control}
                          name="leadId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t("quotes.selectLead")}</FormLabel>
                              <FormControl>
                                <select
                                  suppressHydrationWarning
                                  value={field.value ?? ""}
                                  onChange={(e) => {
                                    const id = e.target.value || null;
                                    field.onChange(id);
                                    if (id) selectLead(id);
                                  }}
                                  className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                                >
                                  <option value="">{t("quotes.noLead")}</option>
                                  {leads.map((l) => (
                                    <option key={l.id} value={l.id}>
                                      {l.company_name}
                                    </option>
                                  ))}
                                </select>
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      )}
                      {clients.length > 0 && (
                        <FormField
                          control={form.control}
                          name="clientId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t("quotes.selectClient")}</FormLabel>
                              <FormControl>
                                <select
                                  suppressHydrationWarning
                                  {...field}
                                  value={field.value ?? ""}
                                  onChange={(e) => {
                                    field.onChange(e.target.value || null);
                                    if (e.target.value) selectClient(e.target.value);
                                  }}
                                  className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                                >
                                  <option value="">{t("quotes.newClient")}</option>
                                  {clients.map((c) => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                  ))}
                                </select>
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      )}
                      <div className="grid gap-3 sm:grid-cols-2">
                        <FormField control={form.control} name="clientName" render={({ field }) => (
                          <FormItem><FormLabel>{t("form.clientName")}</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="clientCompany" render={({ field }) => (
                          <FormItem><FormLabel>{t("form.clientCompany")}</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="clientEmail" render={({ field }) => (
                          <FormItem><FormLabel>{t("form.clientEmail")}</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="clientPhone" render={({ field }) => (
                          <FormItem><FormLabel>{t("form.clientPhone")}</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="clientAddress" render={({ field }) => (
                          <FormItem className="sm:col-span-2"><FormLabel>{t("form.clientAddress")}</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                      </div>
                    </section>
                  )}

                  {step === "items" && (
                    <section className="space-y-4 rounded-xl border border-border/60 bg-card p-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold">{t("form.servicesSection")}</h3>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            append({ description: "", quantity: 1, unitPriceCents: 0, discountPercent: 0 })
                          }
                        >
                          <Plus className="size-3.5" /> {t("form.addLine")}
                        </Button>
                      </div>
                      {fields.map((field, index) => (
                        <div
                          key={field.id}
                          className="grid gap-2 rounded-lg border border-border/40 p-3 sm:grid-cols-[1fr_70px_100px_70px_40px]"
                        >
                          <FormField control={form.control} name={`items.${index}.description`} render={({ field: f }) => (
                            <FormItem><FormLabel>{t("form.description")}</FormLabel><FormControl><Input {...f} /></FormControl><FormMessage /></FormItem>
                          )} />
                          <FormField control={form.control} name={`items.${index}.quantity`} render={({ field: f }) => (
                            <FormItem><FormLabel>{t("form.quantity")}</FormLabel><FormControl><Input type="number" step="0.01" {...f} /></FormControl><FormMessage /></FormItem>
                          )} />
                          <FormField control={form.control} name={`items.${index}.unitPriceCents`} render={({ field: f }) => (
                            <FormItem><FormLabel>{t("form.unitPrice")}</FormLabel><FormControl><Input type="number" {...f} onChange={(e) => f.onChange(Math.round(Number(e.target.value) * 100))} value={Number(f.value) / 100 || ""} /></FormControl><FormMessage /></FormItem>
                          )} />
                          <FormField control={form.control} name={`items.${index}.discountPercent`} render={({ field: f }) => (
                            <FormItem><FormLabel>{t("form.discount")}</FormLabel><FormControl><Input type="number" min={0} max={100} {...f} /></FormControl><FormMessage /></FormItem>
                          )} />
                          <div className="flex items-end">
                            <Button type="button" variant="ghost" size="icon-sm" onClick={() => remove(index)} disabled={fields.length === 1}>
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </section>
                  )}

                  {step === "summary" && (
                    <section className="space-y-3 rounded-xl border border-border/60 bg-card p-4">
                      <h3 className="text-sm font-semibold">{t("quotes.steps.summary")}</h3>
                      <FormField control={form.control} name="taxRate" render={({ field }) => (
                        <FormItem><FormLabel>{t("form.tax")} (%)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={form.control} name="discountCents" render={({ field }) => (
                        <FormItem><FormLabel>{t("form.discount")} (€)</FormLabel><FormControl><Input type="number" {...field} onChange={(e) => field.onChange(Math.round(Number(e.target.value) * 100))} value={Number(field.value) / 100 || ""} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <div className="rounded-lg bg-muted/30 p-4 text-sm space-y-2">
                        <div className="flex justify-between"><span>{t("form.subtotal")}</span><span>{preview.subtotalCents / 100} €</span></div>
                        <div className="flex justify-between"><span>{t("form.discount")}</span><span>−{preview.discountCents / 100} €</span></div>
                        <div className="flex justify-between"><span>{t("form.tax")}</span><span>{preview.taxCents / 100} €</span></div>
                        <div className="flex justify-between font-semibold border-t pt-2"><span>{t("form.total")}</span><span>{preview.totalCents / 100} €</span></div>
                      </div>
                    </section>
                  )}

                  {step === "details" && (
                    <section className="space-y-4 rounded-xl border border-border/60 bg-card p-4">
                      <h3 className="text-sm font-semibold">{t("quotes.steps.details")}</h3>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <FormField control={form.control} name="issueDate" render={({ field }) => (
                          <FormItem><FormLabel>{t("quotes.issueDate")}</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="validUntil" render={({ field }) => (
                          <FormItem><FormLabel>{t("columns.validUntil")}</FormLabel><FormControl><Input type="date" {...field} value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value || null)} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="assignedTo" render={({ field }) => (
                          <FormItem><FormLabel>{t("quotes.columns.assignee")}</FormLabel><FormControl>
                            <select suppressHydrationWarning {...field} value={field.value ?? ""} onChange={(e) => field.onChange(e.target.value || null)} className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm">
                              {members.map((m) => <option key={m.id} value={m.id}>{m.full_name ?? m.id.slice(0, 8)}</option>)}
                            </select>
                          </FormControl></FormItem>
                        )} />
                        <FormField control={form.control} name="paymentTerms" render={({ field }) => (
                          <FormItem className="sm:col-span-2"><FormLabel>{t("quotes.paymentTerms")}</FormLabel><FormControl><Input {...field} placeholder={t("quotes.paymentTermsPlaceholder")} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="notes" render={({ field }) => (
                          <FormItem><FormLabel>{t("form.notes")}</FormLabel><FormControl><Textarea rows={3} {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="internalNotes" render={({ field }) => (
                          <FormItem><FormLabel>{t("quotes.internalNotes")}</FormLabel><FormControl><Textarea rows={3} {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="signatureText" render={({ field }) => (
                          <FormItem className="sm:col-span-2"><FormLabel>{t("form.signature")}</FormLabel><FormControl><Textarea rows={2} {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                      </div>
                    </section>
                  )}
                </motion.div>
              </AnimatePresence>

              <div className="flex items-center justify-between pt-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={stepIndex === 0}
                  onClick={() => setStep(STEPS[stepIndex - 1]!)}
                >
                  <ChevronLeft className="size-4" /> {t("quotes.back")}
                </Button>
                {stepIndex < STEPS.length - 1 ? (
                  <Button type="button" onClick={() => setStep(STEPS[stepIndex + 1]!)}>
                    {t("quotes.next")} <ChevronRight className="size-4" />
                  </Button>
                ) : (
                  <Button type="submit" disabled={pending}>
                    {pending && <Loader2 className="size-4 animate-spin" />}
                    {t("quotes.save")}
                  </Button>
                )}
              </div>
            </form>
          </Form>

          <QuotePreviewPanel
            company={{
              name: company.name,
              legalName: company.legal_name,
              taxId: company.tax_id,
              email: company.email,
              phone: company.phone,
              logoUrl: company.logo_url,
            }}
            values={watched}
            totals={preview}
            locale={locale}
          />
        </div>
      </OperationsWorkspace>
    </OperationsPage>
  );
}
