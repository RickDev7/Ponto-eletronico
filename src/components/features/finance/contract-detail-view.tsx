"use client";

import { useMemo, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import { FileDown, Pencil, RefreshCw, Receipt } from "lucide-react";
import { ROUTES } from "@/config/constants";
import { formatDate, formatMoney } from "@/lib/finance/utils";
import {
  clientName,
  computeContractForecast,
  resolveContractStatus,
  type ContractListRow,
} from "@/lib/finance/contracts-data";
import { ContractStatusBadge } from "@/components/features/finance/finance-status-badge";
import { ContractForecastChart } from "@/components/features/finance/contract-forecast-chart";
import { openFinancePdf, type PdfDocumentData } from "@/lib/finance/pdf";
import { updateContractStatusAction } from "@/actions/finance/actions";
import { useInvoiceMutations } from "@/hooks/use-invoice-mutations";
import {
  OperationsPage,
  OperationsWorkspace,
  PageHeader,
} from "@/components/shared";
import { Button } from "@/components/ui/button";

interface ContractEvent {
  id: string;
  event_type: string;
  message: string | null;
  created_at: string;
  creator?: { full_name: string | null } | { full_name: string | null }[] | null;
}

interface RelatedInvoice {
  id: string;
  invoice_number: string;
  issue_date: string;
  due_date: string;
  total_cents: number;
  status: string;
  amount_paid_cents: number;
}

interface CompanyPreview {
  name: string;
  legal_name: string | null;
  tax_id: string | null;
  email: string | null;
  phone: string | null;
  logo_url: string | null;
}

interface ContractDetailViewProps {
  slug: string;
  contract: ContractListRow;
  events: ContractEvent[];
  invoices: RelatedInvoice[];
  company: CompanyPreview;
  locale: string;
  canWrite: boolean;
}

const EVENT_LABELS: Record<string, string> = {
  created: "contracts.timeline.created",
  updated: "contracts.timeline.updated",
  invoice_generated: "contracts.timeline.invoiceGenerated",
  payment_received: "contracts.timeline.paymentReceived",
  renewed: "contracts.timeline.renewed",
  suspended: "contracts.timeline.suspended",
  cancelled: "contracts.timeline.cancelled",
  duplicated: "contracts.timeline.duplicated",
  deleted: "contracts.timeline.deleted",
  comment: "contracts.timeline.comment",
};

export function ContractDetailView({
  slug,
  contract,
  events,
  invoices,
  company,
  locale,
  canWrite,
}: ContractDetailViewProps) {
  const t = useTranslations("finance");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const invoiceMutations = useInvoiceMutations(slug);
  const status = resolveContractStatus(contract);
  const forecast = useMemo(
    () => computeContractForecast(contract, locale, 12),
    [contract, locale],
  );

  const revenueGenerated = invoices.reduce(
    (s, i) => s + (i.amount_paid_cents ?? 0),
    0,
  );

  function pdfLabels(): PdfDocumentData["labels"] {
    return {
      quoteTitle: t("pdf.quoteTitle"),
      invoiceTitle: t("pdf.invoiceTitle"),
      contractTitle: t("pdf.contractTitle"),
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
    openFinancePdf({
      type: "contract",
      number: contract.contract_number ?? contract.id.slice(0, 8),
      company: {
        name: company.name,
        legalName: company.legal_name,
        taxId: company.tax_id,
        email: company.email,
        phone: company.phone,
        logoUrl: company.logo_url,
      },
      clientName: clientName(contract),
      issueDate: contract.start_date,
      dueDate: contract.end_date,
      items: (contract.items ?? []).map((i) => ({
        description: i.description,
        quantity: Number(i.quantity),
        unitPriceCents: i.unit_price_cents,
        lineTotalCents: i.line_total_cents,
      })),
      subtotalCents: contract.subtotal_cents ?? contract.amount_cents,
      discountCents: contract.discount_cents ?? 0,
      taxRate: Number(contract.tax_rate),
      taxCents: contract.tax_cents ?? 0,
      totalCents: contract.total_cents ?? contract.amount_cents,
      notes: contract.notes ?? undefined,
      locale,
      labels: pdfLabels(),
    });
  }

  return (
    <OperationsPage>
      <PageHeader
        title={contract.contract_number ?? contract.title}
        description={clientName(contract)}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={handlePdf}>
              <FileDown className="size-3.5" />
              {t("actions.pdf")}
            </Button>
            {canWrite && (
              <>
                {contract.next_invoice_date && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pending}
                    onClick={() =>
                      startTransition(async () => {
                        const r = await invoiceMutations.generateFromContract.mutateAsync({
                          contractId: contract.id,
                          mode: "recurring",
                        });
                        if (!r.success) toast.error(r.error);
                        else {
                          toast.success(t("invoices.toast.generated"));
                          router.push(ROUTES.financeInvoice(slug, r.data.id));
                        }
                      })
                    }
                  >
                    <Receipt className="size-3.5" />
                    {t("invoices.generateFromContract")}
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      const r = await invoiceMutations.generateFromContract.mutateAsync({
                        contractId: contract.id,
                        mode: "one_time",
                      });
                      if (!r.success) toast.error(r.error);
                      else {
                        toast.success(t("invoices.toast.created"));
                        router.push(ROUTES.financeInvoice(slug, r.data.id));
                      }
                    })
                  }
                >
                  <Receipt className="size-3.5" />
                  {t("invoices.newOneTime")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      const r = await updateContractStatusAction(slug, contract.id, "renewing");
                      if (!r.success) toast.error(r.error);
                      else toast.success(t("toast.saved"));
                    })
                  }
                >
                  <RefreshCw className="size-3.5" />
                  {t("contracts.actions.renew")}
                </Button>
                <Link
                  href={ROUTES.financeContractEdit(slug, contract.id)}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium"
                >
                  <Pencil className="size-3.5" />
                  {t("contracts.actions.edit")}
                </Link>
              </>
            )}
          </div>
        }
      />

      <OperationsWorkspace>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <section className="rounded-xl border border-border/60 bg-card p-5">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold">{t("contracts.detail.overview")}</h3>
                <ContractStatusBadge status={status} />
              </div>
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-muted-foreground">{t("columns.service")}</dt>
                  <dd className="font-medium">{contract.title}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">{t("columns.frequency")}</dt>
                  <dd>{t(`frequency.${contract.frequency as "monthly"}`)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">{t("columns.startDate")}</dt>
                  <dd>{formatDate(contract.start_date, locale)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">{t("contracts.columns.nextBilling")}</dt>
                  <dd>
                    {contract.next_invoice_date
                      ? formatDate(contract.next_invoice_date, locale)
                      : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">{t("columns.amount")}</dt>
                  <dd className="font-semibold tabular-nums">
                    {formatMoney(contract.total_cents ?? contract.amount_cents, "EUR", locale)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">{t("contracts.detail.revenueGenerated")}</dt>
                  <dd className="font-semibold tabular-nums text-emerald-600">
                    {formatMoney(revenueGenerated, "EUR", locale)}
                  </dd>
                </div>
              </dl>
            </section>

            <section className="rounded-xl border border-border/60 bg-card p-5">
              <h3 className="mb-4 text-sm font-semibold">{t("contracts.detail.forecast")}</h3>
              <ContractForecastChart
                data={forecast}
                locale={locale}
                totalLabel={t("contracts.detail.forecastTotal")}
              />
            </section>

            <section className="rounded-xl border border-border/60 bg-card p-5">
              <h3 className="mb-4 text-sm font-semibold">{t("contracts.detail.invoices")}</h3>
              {invoices.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("contracts.detail.noInvoices")}</p>
              ) : (
                <ul className="divide-y divide-border/60">
                  {invoices.map((inv) => (
                    <li key={inv.id} className="flex items-center justify-between py-2 text-sm">
                      <div>
                        <Link
                          href={ROUTES.financeInvoice(slug, inv.id)}
                          className="font-mono text-xs font-medium text-primary hover:underline"
                        >
                          {inv.invoice_number}
                        </Link>
                        <span className="ml-2 text-xs text-muted-foreground">
                          {formatDate(inv.issue_date, locale)}
                        </span>
                      </div>
                      <span className="tabular-nums font-medium">
                        {formatMoney(inv.total_cents, "EUR", locale)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <section className="rounded-xl border border-border/60 bg-card p-5">
            <h3 className="mb-4 text-sm font-semibold">{t("contracts.detail.timeline")}</h3>
            <ol className="relative space-y-4 border-l border-border/60 pl-4">
              {events.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("contracts.detail.noEvents")}</p>
              ) : (
                events.map((ev) => {
                  const creator = ev.creator;
                  const name = Array.isArray(creator)
                    ? creator[0]?.full_name
                    : creator?.full_name;
                  const labelKey = EVENT_LABELS[ev.event_type];
                  return (
                    <li key={ev.id} className="relative">
                      <span className="absolute -left-[21px] top-1 size-2.5 rounded-full bg-primary" />
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
      </OperationsWorkspace>
    </OperationsPage>
  );
}
