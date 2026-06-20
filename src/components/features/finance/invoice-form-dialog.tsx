"use client";

import { useMemo, useTransition, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { createInvoiceSchema, type CreateInvoiceInput } from "@/lib/validations/finance";
import { calculateLineTotal, calculateTotals, formatMoney } from "@/lib/finance/utils";
import { useInvoiceMutations } from "@/hooks/use-invoice-mutations";
import { OPERATIONS_FORM_CLASS } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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

interface ClientOption {
  id: string;
  name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
}

interface ContractOption {
  id: string;
  title: string;
  client_id: string;
  amount_cents: number;
}

interface InvoiceFormDialogProps {
  slug: string;
  locale: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: ClientOption[];
  contracts: ContractOption[];
  defaultBankDetails?: string;
  initialClientId?: string | null;
}

export function InvoiceFormDialog({
  slug,
  locale,
  open,
  onOpenChange,
  clients,
  contracts,
  defaultBankDetails = "",
  initialClientId,
}: InvoiceFormDialogProps) {
  const t = useTranslations("finance");
  const [pending, startTransition] = useTransition();
  const { createInvoice } = useInvoiceMutations(slug);

  const form = useForm<CreateInvoiceInput>({
    resolver: zodResolver(createInvoiceSchema),
    defaultValues: {
      clientId: initialClientId ?? clients[0]?.id ?? null,
      contractId: null,
      clientName: clients[0]?.name ?? "",
      clientCompany: clients[0]?.contact_name ?? "",
      clientEmail: clients[0]?.email ?? "",
      clientPhone: clients[0]?.phone ?? "",
      issueDate: new Date().toISOString().slice(0, 10),
      dueDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      taxRate: 19,
      discountCents: 0,
      notes: "",
      bankDetails: defaultBankDetails,
      items: [{ description: "", quantity: 1, unitPriceCents: 0, discountPercent: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control: form.control, name: "items" });
  const watched = useWatch({ control: form.control });

  const totals = useMemo(() => {
    const items = (watched.items ?? []).map((item) => ({
      lineTotalCents: calculateLineTotal(
        Number(item?.quantity ?? 0),
        Number(item?.unitPriceCents ?? 0),
        Number(item?.discountPercent ?? 0),
      ),
    }));
    return calculateTotals(items, Number(watched.taxRate ?? 19), Number(watched.discountCents ?? 0));
  }, [watched]);

  function selectClient(clientId: string) {
    const client = clients.find((c) => c.id === clientId);
    if (!client) return;
    form.setValue("clientId", clientId);
    form.setValue("clientName", client.name);
    form.setValue("clientCompany", client.contact_name ?? "");
    form.setValue("clientEmail", client.email ?? "");
    form.setValue("clientPhone", client.phone ?? "");
  }

  useEffect(() => {
    if (open && initialClientId) {
      selectClient(initialClientId);
    }
  }, [open, initialClientId, clients]);

  function selectContract(contractId: string) {
    const contract = contracts.find((c) => c.id === contractId);
    if (!contract) return;
    form.setValue("contractId", contractId);
    selectClient(contract.client_id);
    if (fields.length === 1 && !form.getValues("items.0.description")) {
      form.setValue("items.0.description", contract.title);
      form.setValue("items.0.unitPriceCents", contract.amount_cents);
    }
  }

  function onSubmit(values: CreateInvoiceInput) {
    startTransition(async () => {
      const result = await createInvoice.mutateAsync(values);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(t("toast.invoiceCreated"));
      onOpenChange(false);
      form.reset();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("invoices.new")}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className={OPERATIONS_FORM_CLASS}>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField control={form.control} name="clientId" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("columns.client")}</FormLabel>
                  <FormControl>
                    <select
                      suppressHydrationWarning
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) => {
                        const v = e.target.value || null;
                        field.onChange(v);
                        if (v) selectClient(v);
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
              )} />
              <FormField control={form.control} name="contractId" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("invoices.columns.contract")}</FormLabel>
                  <FormControl>
                    <select
                      suppressHydrationWarning
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) => {
                        const v = e.target.value || null;
                        field.onChange(v);
                        if (v) selectContract(v);
                      }}
                      className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                    >
                      <option value="">{t("filters.all")}</option>
                      {contracts.map((c) => (
                        <option key={c.id} value={c.id}>{c.title}</option>
                      ))}
                    </select>
                  </FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="clientName" render={({ field }) => (
                <FormItem><FormLabel>{t("form.clientName")}</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="issueDate" render={({ field }) => (
                <FormItem><FormLabel>{t("columns.issueDate")}</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="dueDate" render={({ field }) => (
                <FormItem><FormLabel>{t("columns.dueDate")}</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">{t("form.servicesSection")}</p>
                <Button type="button" variant="outline" size="sm" onClick={() => append({ description: "", quantity: 1, unitPriceCents: 0, discountPercent: 0 })}>
                  <Plus className="size-3.5" /> {t("form.addLine")}
                </Button>
              </div>
              {fields.map((field, index) => (
                <div key={field.id} className="grid gap-2 rounded-lg border border-border/40 p-3 sm:grid-cols-[1fr_70px_100px_70px_36px]">
                  <FormField control={form.control} name={`items.${index}.description`} render={({ field: f }) => (
                    <FormItem><FormControl><Input placeholder={t("form.description")} {...f} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name={`items.${index}.quantity`} render={({ field: f }) => (
                    <FormItem><FormControl><Input type="number" step="0.01" {...f} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name={`items.${index}.unitPriceCents`} render={({ field: f }) => (
                    <FormItem><FormControl><Input type="number" {...f} onChange={(e) => f.onChange(Math.round(Number(e.target.value) * 100))} value={Number(f.value) / 100 || ""} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name={`items.${index}.discountPercent`} render={({ field: f }) => (
                    <FormItem><FormControl><Input type="number" min={0} max={100} placeholder="%" {...f} /></FormControl></FormItem>
                  )} />
                  <Button type="button" variant="ghost" size="icon-sm" onClick={() => remove(index)} disabled={fields.length === 1}>
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="rounded-lg bg-muted/30 p-3 text-sm space-y-1">
              <div className="flex justify-between"><span>{t("form.subtotal")}</span><span>{formatMoney(totals.subtotalCents, "EUR", locale)}</span></div>
              <div className="flex justify-between"><span>{t("form.tax")}</span><span>{formatMoney(totals.taxCents, "EUR", locale)}</span></div>
              <div className="flex justify-between font-semibold border-t pt-2"><span>{t("form.total")}</span><span>{formatMoney(totals.totalCents, "EUR", locale)}</span></div>
            </div>

            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem><FormLabel>{t("form.notes")}</FormLabel><FormControl><Textarea rows={2} {...field} /></FormControl></FormItem>
            )} />
            <FormField control={form.control} name="bankDetails" render={({ field }) => (
              <FormItem><FormLabel>{t("pdf.bankDetails")}</FormLabel><FormControl><Textarea rows={2} {...field} /></FormControl></FormItem>
            )} />

            <Button type="submit" disabled={pending} className="w-full">
              {pending && <Loader2 className="size-4 animate-spin" />}
              {t("invoices.save")}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
