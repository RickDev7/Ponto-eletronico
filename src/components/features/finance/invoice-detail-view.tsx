"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import {
  Ban,
  Check,
  Copy,
  ExternalLink,
  FileDown,
  Mail,
  Wallet,
} from "lucide-react";
import { ROUTES } from "@/config/constants";
import { formatDate, formatMoney } from "@/lib/finance/utils";
import {
  balanceCents,
  contractTitle,
  type InvoiceListRow,
} from "@/lib/finance/invoices-data";
import { invoiceKindLabel, invoiceToPdfDocument } from "@/lib/finance/invoicing-engine";
import { InvoiceStatusBadge } from "@/components/features/finance/finance-status-badge";
import { PaymentRecordDialog } from "@/components/features/finance/payment-record-dialog";
import { openFinancePdf } from "@/lib/finance/pdf";
import { useInvoiceMutations } from "@/hooks/use-invoice-mutations";
import {
  OperationsPage,
  OperationsWorkspace,
  PageHeader,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface InvoiceEvent {
  id: string;
  event_type: string;
  message: string | null;
  created_at: string;
  creator?: { full_name: string | null } | { full_name: string | null }[] | null;
}

interface CompanyPreview {
  name: string;
  legal_name: string | null;
  tax_id: string | null;
  email: string | null;
  phone: string | null;
  logo_url: string | null;
}

interface InvoiceDetailViewProps {
  slug: string;
  invoice: InvoiceListRow;
  events: InvoiceEvent[];
  company: CompanyPreview;
  locale: string;
  canWrite: boolean;
}

const EVENT_LABELS: Record<string, string> = {
  created: "invoices.timeline.created",
  updated: "invoices.timeline.updated",
  sent: "invoices.timeline.sent",
  paid: "invoices.timeline.paid",
  partial: "invoices.timeline.partial",
  overdue: "invoices.timeline.overdue",
  cancelled: "invoices.timeline.cancelled",
  duplicated: "invoices.timeline.duplicated",
  deleted: "invoices.timeline.deleted",
  payment_received: "invoices.timeline.paymentReceived",
  pdf_generated: "invoices.timeline.pdfGenerated",
  recurring_generated: "invoices.timeline.recurringGenerated",
};

export function InvoiceDetailView({
  slug,
  invoice,
  events,
  company,
  locale,
  canWrite,
}: InvoiceDetailViewProps) {
  const t = useTranslations("finance");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const mutations = useInvoiceMutations(slug);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const kind = invoiceKindLabel(invoice.kind);
  const remaining = balanceCents(invoice);

  function pdfLabels() {
    return {
      quoteTitle: t("pdf.quoteTitle"),
      invoiceTitle: t("pdf.invoiceTitle"),
      from: t("pdf.from"),
      to: t("pdf.to"),
      date: t("pdf.date"),
      dueDate: t("pdf.dueDate"),
      validUntil: t("pdf.validUntil"),
      description: t("pdf.description"),
      quantity: t("pdf.quantity"),
      unitPrice: t("pdf.unitPrice"),
      total: t("pdf.total"),
      subtotal: t("pdf.subtotal"),
      tax: t("pdf.tax"),
      grandTotal: t("pdf.grandTotal"),
      notes: t("pdf.notes"),
      bankDetails: t("pdf.bankDetails"),
    };
  }

  function handlePdf() {
    const ok = openFinancePdf(
      invoiceToPdfDocument(invoice, {
        name: company.name,
        legalName: company.legal_name,
        taxId: company.tax_id,
        email: company.email,
        phone: company.phone,
        logoUrl: company.logo_url,
      }, locale, pdfLabels()),
    );
    if (!ok) toast.error("Popup blocked");
  }

  function run(fn: () => Promise<{ success: boolean; error?: string }>, msg?: string) {
    startTransition(async () => {
      const r = await fn();
      if (!r.success) toast.error(r.error);
      else {
        toast.success(msg ?? t("toast.saved"));
        router.refresh();
      }
    });
  }

  return (
    <OperationsPage>
      <PageHeader
        title={invoice.invoice_number}
        description={`${invoice.client_name}${invoice.client_company ? ` · ${invoice.client_company}` : ""}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={handlePdf}>
              <FileDown className="size-3.5" /> {t("actions.pdf")}
            </Button>
            <a
              href={`/api/finance/invoices/${invoice.id}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-input bg-background px-3 text-xs font-medium"
            >
              <ExternalLink className="size-3.5" /> {t("invoices.openPdf")}
            </a>
            {canWrite && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pending}
                  onClick={() => run(() => mutations.duplicate.mutateAsync(invoice.id))}
                >
                  <Copy className="size-3.5" /> {t("actions.duplicate")}
                </Button>
                {invoice.status === "draft" && (
                  <Button
                    size="sm"
                    disabled={pending}
                    onClick={() =>
                      run(() => mutations.updateStatus.mutateAsync({ id: invoice.id, status: "sent" }), t("toast.saved"))
                    }
                  >
                    <Mail className="size-3.5" /> {t("invoices.actions.markSent")}
                  </Button>
                )}
              </>
            )}
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <InvoiceStatusBadge status={invoice.status as import("@/lib/finance/utils").InvoiceStatus} />
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
            kind === "recurring"
              ? "bg-blue-500/10 text-blue-700 dark:text-blue-300"
              : "bg-muted text-muted-foreground",
          )}
        >
          {t(`invoices.kind.${kind}`)}
        </span>
        {invoice.auto_generated && (
          <span className="text-[10px] text-muted-foreground">{t("invoices.autoGenerated")}</span>
        )}
        <span className="text-sm font-semibold tabular-nums">
          {formatMoney(invoice.total_cents, "EUR", locale)}
        </span>
        {remaining > 0 && invoice.status !== "paid" && (
          <span className="text-xs text-amber-600 dark:text-amber-400">
            {t("invoices.balance")}: {formatMoney(remaining, "EUR", locale)}
          </span>
        )}
      </div>

      <OperationsWorkspace>
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            <section className="rounded-xl border border-border/60 bg-card p-5">
              <h3 className="mb-4 text-sm font-semibold">{t("invoices.detail.overview")}</h3>
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-muted-foreground">{t("columns.issueDate")}</dt>
                  <dd>{formatDate(invoice.issue_date, locale)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">{t("columns.dueDate")}</dt>
                  <dd>{formatDate(invoice.due_date, locale)}</dd>
                </div>
                {invoice.period_start && (
                  <div>
                    <dt className="text-xs text-muted-foreground">{t("invoices.detail.period")}</dt>
                    <dd>
                      {formatDate(invoice.period_start, locale)}
                      {invoice.period_end ? ` – ${formatDate(invoice.period_end, locale)}` : ""}
                    </dd>
                  </div>
                )}
                {invoice.contract_id && (
                  <div>
                    <dt className="text-xs text-muted-foreground">{t("invoices.columns.contract")}</dt>
                    <dd>
                      <Link
                        href={ROUTES.financeContract(slug, invoice.contract_id)}
                        className="font-medium text-primary hover:underline"
                      >
                        {contractTitle(invoice)}
                      </Link>
                    </dd>
                  </div>
                )}
              </dl>
            </section>

            <section className="rounded-xl border border-border/60 bg-card p-5">
              <h3 className="mb-4 text-sm font-semibold">{t("pdf.description")}</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/60 text-left text-xs text-muted-foreground">
                      <th className="pb-2 font-medium">{t("pdf.description")}</th>
                      <th className="pb-2 text-right font-medium">{t("pdf.quantity")}</th>
                      <th className="pb-2 text-right font-medium">{t("pdf.unitPrice")}</th>
                      <th className="pb-2 text-right font-medium">{t("pdf.total")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(invoice.items ?? []).map((item, i) => (
                      <tr key={i} className="border-b border-border/40">
                        <td className="py-2">{item.description}</td>
                        <td className="py-2 text-right tabular-nums">{item.quantity}</td>
                        <td className="py-2 text-right tabular-nums">
                          {formatMoney(item.unit_price_cents, "EUR", locale)}
                        </td>
                        <td className="py-2 text-right tabular-nums font-medium">
                          {formatMoney(item.line_total_cents, "EUR", locale)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <dl className="mt-4 space-y-1 border-t border-border/60 pt-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">{t("pdf.subtotal")}</dt>
                  <dd className="tabular-nums">{formatMoney(invoice.subtotal_cents, "EUR", locale)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">{t("pdf.tax")} ({invoice.tax_rate}%)</dt>
                  <dd className="tabular-nums">{formatMoney(invoice.tax_cents, "EUR", locale)}</dd>
                </div>
                <div className="flex justify-between font-semibold">
                  <dt>{t("pdf.grandTotal")}</dt>
                  <dd className="tabular-nums">{formatMoney(invoice.total_cents, "EUR", locale)}</dd>
                </div>
              </dl>
            </section>

            <section className="rounded-xl border border-border/60 bg-card p-5">
              <h3 className="mb-4 text-sm font-semibold">{t("invoices.timelineTitle")}</h3>
              <ol className="relative space-y-4 border-l border-border/60 pl-4">
                {events.length === 0 ? (
                  <li className="text-xs text-muted-foreground">{t("invoices.timelineEmpty")}</li>
                ) : (
                  [...events].reverse().map((ev) => {
                    const creator = ev.creator;
                    const name = creator
                      ? Array.isArray(creator)
                        ? creator[0]?.full_name
                        : creator.full_name
                      : null;
                    const labelKey = EVENT_LABELS[ev.event_type];
                    return (
                      <li key={ev.id} className="relative">
                        <span className="absolute -left-[1.27rem] top-1 size-2 rounded-full bg-primary" />
                        <p className="text-sm font-medium">
                          {labelKey ? t(labelKey) : ev.event_type}
                        </p>
                        {ev.message && (
                          <p className="text-xs text-muted-foreground">{ev.message}</p>
                        )}
                        <p className="text-[10px] text-muted-foreground">
                          {formatDate(ev.created_at.slice(0, 10), locale)}
                          {name ? ` · ${name}` : ""}
                        </p>
                      </li>
                    );
                  })
                )}
              </ol>
            </section>
          </div>

          <div className="space-y-4">
            {invoice.notes && (
              <section className="rounded-xl border border-border/60 bg-card p-4 text-sm">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("pdf.notes")}
                </h3>
                <p className="text-muted-foreground">{invoice.notes}</p>
              </section>
            )}
            {invoice.bank_details && (
              <section className="rounded-xl border border-border/60 bg-card p-4 text-sm">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("pdf.bankDetails")}
                </h3>
                <p className="whitespace-pre-wrap text-muted-foreground">{invoice.bank_details}</p>
              </section>
            )}

            {canWrite && remaining > 0 && invoice.status !== "cancelled" && (
              <Button className="w-full" size="sm" onClick={() => setPaymentOpen(true)}>
                <Wallet className="size-3.5" />
                {t("invoices.actions.recordPayment")}
              </Button>
            )}

            {canWrite && (
              <div className="flex flex-col gap-2">
                {invoice.status !== "paid" && invoice.status !== "cancelled" && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pending}
                    onClick={() =>
                      run(() => mutations.updateStatus.mutateAsync({ id: invoice.id, status: "paid" }))
                    }
                  >
                    <Check className="size-3.5" /> {t("invoices.actions.markPaid")}
                  </Button>
                )}
                {invoice.status !== "cancelled" && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pending}
                    onClick={() =>
                      run(() => mutations.updateStatus.mutateAsync({ id: invoice.id, status: "cancelled" }))
                    }
                  >
                    <Ban className="size-3.5" /> {t("invoices.actions.cancel")}
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </OperationsWorkspace>

      <PaymentRecordDialog
        slug={slug}
        locale={locale}
        invoice={paymentOpen ? invoice : null}
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
      />
    </OperationsPage>
  );
}
