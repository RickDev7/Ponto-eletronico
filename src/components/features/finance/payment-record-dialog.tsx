"use client";

import { useEffect, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { createPaymentSchema, type CreatePaymentInput } from "@/lib/validations/finance";
import { formatMoney } from "@/lib/finance/utils";
import { balanceCents, type InvoiceListRow } from "@/lib/finance/invoices-data";
import { useInvoiceMutations } from "@/hooks/use-invoice-mutations";
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

interface PaymentRecordDialogProps {
  slug: string;
  locale: string;
  invoice: InvoiceListRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PaymentRecordDialog({
  slug,
  locale,
  invoice,
  open,
  onOpenChange,
}: PaymentRecordDialogProps) {
  const t = useTranslations("finance");
  const [pending, startTransition] = useTransition();
  const { recordPayment } = useInvoiceMutations(slug);

  const form = useForm<CreatePaymentInput>({
    resolver: zodResolver(createPaymentSchema),
    defaultValues: {
      invoiceId: invoice?.id ?? "",
      amountCents: invoice ? balanceCents(invoice) : 0,
      paymentDate: new Date().toISOString().slice(0, 10),
      method: "bank_transfer",
    },
  });

  useEffect(() => {
    if (!invoice) return;
    form.reset({
      invoiceId: invoice.id,
      amountCents: balanceCents(invoice),
      paymentDate: new Date().toISOString().slice(0, 10),
      method: "bank_transfer",
    });
  }, [invoice, form]);

  function onSubmit(values: CreatePaymentInput) {
    startTransition(async () => {
      const result = await recordPayment.mutateAsync(values);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(t("toast.paymentRecorded"));
      onOpenChange(false);
    });
  }

  if (!invoice) return null;

  const balance = balanceCents(invoice);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("invoices.actions.recordPayment")}</DialogTitle>
        </DialogHeader>
        <div className="mb-4 space-y-1 rounded-lg bg-muted/30 p-3 text-sm">
          <p className="font-medium">{invoice.invoice_number} · {invoice.client_name}</p>
          <div className="flex justify-between text-muted-foreground">
            <span>{t("form.total")}</span>
            <span>{formatMoney(invoice.total_cents, "EUR", locale)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>{t("invoices.paid")}</span>
            <span>{formatMoney(invoice.amount_paid_cents, "EUR", locale)}</span>
          </div>
          <div className="flex justify-between font-semibold">
            <span>{t("invoices.balance")}</span>
            <span>{formatMoney(balance, "EUR", locale)}</span>
          </div>
        </div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
            <FormField control={form.control} name="amountCents" render={({ field }) => (
              <FormItem>
                <FormLabel>{t("invoices.paymentAmount")}</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    {...field}
                    onChange={(e) => field.onChange(Math.round(Number(e.target.value) * 100))}
                    value={Number(field.value) / 100 || ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="paymentDate" render={({ field }) => (
              <FormItem><FormLabel>{t("columns.date")}</FormLabel><FormControl><Input type="date" {...field} /></FormControl></FormItem>
            )} />
            <FormField control={form.control} name="method" render={({ field }) => (
              <FormItem>
                <FormLabel>{t("columns.method")}</FormLabel>
                <FormControl>
                  <select suppressHydrationWarning {...field} className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm">
                    {(["bank_transfer", "cash", "card", "other"] as const).map((m) => (
                      <option key={m} value={m}>{t(`paymentMethod.${m}`)}</option>
                    ))}
                  </select>
                </FormControl>
              </FormItem>
            )} />
            <Button type="submit" disabled={pending} className="w-full">
              {pending && <Loader2 className="size-4 animate-spin" />}
              {t("payments.record")}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
