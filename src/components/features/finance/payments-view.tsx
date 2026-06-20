"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createPaymentAction } from "@/actions/finance/actions";
import { createPaymentSchema, type CreatePaymentInput } from "@/lib/validations/finance";
import { formatDate, formatMoney } from "@/lib/finance/utils";
import {
  EmptyState,
  OperationsPage,
  OperationsWorkspace,
  PageHeader,
  OPERATIONS_FORM_CLASS,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface PaymentRow {
  id: string;
  amount_cents: number;
  payment_date: string;
  method: string;
  reference: string | null;
  invoice: { invoice_number: string; client_name: string } | Array<{ invoice_number: string; client_name: string }> | null;
}

interface InvoiceOption {
  id: string;
  invoice_number: string;
  client_name: string;
  total_cents: number;
  amount_paid_cents: number;
}

interface PaymentsViewProps {
  slug: string;
  payments: PaymentRow[];
  openInvoices: InvoiceOption[];
  locale: string;
  canWrite: boolean;
}

export function PaymentsView({ slug, payments, openInvoices, locale, canWrite }: PaymentsViewProps) {
  const t = useTranslations("finance");
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const form = useForm<CreatePaymentInput>({
    resolver: zodResolver(createPaymentSchema),
    defaultValues: {
      invoiceId: openInvoices[0]?.id ?? "",
      amountCents: 0,
      paymentDate: new Date().toISOString().slice(0, 10),
      method: "bank_transfer",
    },
  });

  function invoiceMeta(row: PaymentRow) {
    const inv = row.invoice;
    if (!inv) return { number: "—", client: "—" };
    const data = Array.isArray(inv) ? inv[0] : inv;
    return { number: data?.invoice_number ?? "—", client: data?.client_name ?? "—" };
  }

  function onSubmit(values: CreatePaymentInput) {
    startTransition(async () => {
      const result = await createPaymentAction(slug, values);
      if (!result.success) toast.error(result.error);
      else {
        toast.success(t("toast.paymentRecorded"));
        setOpen(false);
      }
    });
  }

  return (
    <OperationsPage>
      <PageHeader
        title={t("payments.title")}
        description={t("payments.description")}
        actions={
          canWrite ? (
            <Button size="sm" onClick={() => setOpen(true)} disabled={openInvoices.length === 0}>
              <Plus className="size-3.5" /> {t("payments.record")}
            </Button>
          ) : undefined
        }
      />

      <OperationsWorkspace>
        {payments.length === 0 ? (
          <EmptyState title={t("payments.empty")} description={t("payments.emptyHint")} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("columns.invoice")}</TableHead>
                <TableHead>{t("columns.client")}</TableHead>
                <TableHead>{t("columns.date")}</TableHead>
                <TableHead>{t("columns.amount")}</TableHead>
                <TableHead>{t("columns.method")}</TableHead>
                <TableHead>{t("columns.reference")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((p) => {
                const meta = invoiceMeta(p);
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{meta.number}</TableCell>
                    <TableCell>{meta.client}</TableCell>
                    <TableCell>{formatDate(p.payment_date, locale)}</TableCell>
                    <TableCell>{formatMoney(p.amount_cents, "EUR", locale)}</TableCell>
                    <TableCell>{t(`paymentMethod.${p.method}` as "paymentMethod.bank_transfer")}</TableCell>
                    <TableCell>{p.reference ?? "—"}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </OperationsWorkspace>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("payments.record")}</DialogTitle></DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className={OPERATIONS_FORM_CLASS}>
              <FormField control={form.control} name="invoiceId" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("columns.invoice")}</FormLabel>
                  <FormControl>
                    <select {...field} className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm">
                      {openInvoices.map((inv) => (
                        <option key={inv.id} value={inv.id}>
                          {inv.invoice_number} — {inv.client_name}
                        </option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="amountCents" render={({ field }) => (
                <FormItem><FormLabel>{t("columns.amount")}</FormLabel><FormControl><Input type="number" {...field} onChange={(e) => field.onChange(Math.round(Number(e.target.value) * 100))} value={Number(field.value) / 100 || ""} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="paymentDate" render={({ field }) => (
                <FormItem><FormLabel>{t("columns.date")}</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <Button type="submit" disabled={pending} className="w-full">{t("payments.save")}</Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </OperationsPage>
  );
}
