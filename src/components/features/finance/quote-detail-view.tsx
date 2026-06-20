"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import {
  Check,
  FileDown,
  Mail,
  Pencil,
  ScrollText,
  X,
} from "lucide-react";
import { ROUTES } from "@/config/constants";
import { formatDate, formatMoney } from "@/lib/finance/utils";
import { displayStatus, type QuoteListRow } from "@/lib/finance/quotes-data";
import { QuoteStatusBadge } from "@/components/features/finance/finance-status-badge";
import { QuotePreviewPanel } from "@/components/features/finance/quote-preview-panel";
import { openFinancePdf, type PdfDocumentData } from "@/lib/finance/pdf";
import { useQuoteMutations } from "@/hooks/use-quote-mutations";
import {
  OperationsPage,
  OperationsWorkspace,
  PageHeader,
} from "@/components/shared";
import { Button } from "@/components/ui/button";

interface QuoteEvent {
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

interface QuoteDetailViewProps {
  slug: string;
  quote: QuoteListRow;
  events: QuoteEvent[];
  company: CompanyPreview;
  locale: string;
  canWrite: boolean;
}

const EVENT_LABELS: Record<string, string> = {
  created: "timeline.created",
  updated: "timeline.updated",
  sent: "timeline.sent",
  viewed: "timeline.viewed",
  accepted: "timeline.accepted",
  rejected: "timeline.rejected",
  duplicated: "timeline.duplicated",
  converted: "timeline.converted",
  deleted: "timeline.deleted",
};

export function QuoteDetailView({
  slug,
  quote,
  events,
  company,
  locale,
  canWrite,
}: QuoteDetailViewProps) {
  const t = useTranslations("finance");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const mutations = useQuoteMutations(slug);

  function pdfLabels(): PdfDocumentData["labels"] {
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
    openFinancePdf({
      type: "quote",
      number: quote.quote_number,
      company: {
        name: company.name,
        legalName: company.legal_name,
        taxId: company.tax_id,
        email: company.email,
        phone: company.phone,
        logoUrl: company.logo_url,
      },
      clientName: quote.client_name,
      clientCompany: quote.client_company,
      clientEmail: quote.client_email,
      clientPhone: quote.client_phone,
      issueDate: quote.issue_date ?? quote.created_at,
      validUntil: quote.valid_until,
      items: (quote.items ?? []).map((i) => ({
        description: i.description,
        quantity: Number(i.quantity),
        unitPriceCents: i.unit_price_cents,
        lineTotalCents: i.line_total_cents,
      })),
      subtotalCents: quote.subtotal_cents,
      discountCents: quote.discount_cents ?? 0,
      taxRate: Number(quote.tax_rate),
      taxCents: quote.tax_cents,
      totalCents: quote.total_cents,
      notes: quote.notes,
      signatureText: quote.signature_text,
      locale,
      labels: pdfLabels(),
    });
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

  const status = displayStatus(quote);

  return (
    <OperationsPage>
      <PageHeader
        title={quote.quote_number}
        description={`${quote.client_name}${quote.client_company ? ` · ${quote.client_company}` : ""}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={handlePdf}>
              <FileDown className="size-3.5" /> {t("actions.pdf")}
            </Button>
            {canWrite && (
              <>
                <Link
                  href={ROUTES.financeQuoteEdit(slug, quote.id)}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-input bg-background px-3 text-xs font-medium"
                >
                  <Pencil className="size-3.5" /> {t("quotes.actions.edit")}
                </Link>
                <Button
                  size="sm"
                  onClick={() =>
                    run(
                      () => mutations.convertToContract.mutateAsync(quote.id),
                      t("toast.contractCreated"),
                    )
                  }
                  disabled={pending}
                >
                  <ScrollText className="size-3.5" /> {t("actions.convertContract")}
                </Button>
              </>
            )}
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <QuoteStatusBadge status={status} />
        <span className="text-sm font-semibold tabular-nums">
          {formatMoney(quote.total_cents, "EUR", locale)}
        </span>
        <span className="text-xs text-muted-foreground">
          {t("columns.validUntil")}:{" "}
          {quote.valid_until ? formatDate(quote.valid_until, locale) : "—"}
        </span>
      </div>

      <OperationsWorkspace>
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            <section className="rounded-xl border border-border/60 bg-card p-4">
              <h3 className="mb-4 text-sm font-semibold">{t("quotes.timelineTitle")}</h3>
              <ol className="relative space-y-4 border-l border-border/60 pl-4">
                {events.length === 0 ? (
                  <li className="text-xs text-muted-foreground">{t("quotes.timelineEmpty")}</li>
                ) : (
                  events.map((ev) => {
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
                          {labelKey ? t(`quotes.${labelKey}` as "quotes.timeline.created") : ev.event_type}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(ev.created_at, locale)}
                          {name && ` · ${name}`}
                        </p>
                      </li>
                    );
                  })
                )}
              </ol>
            </section>

            {canWrite && status !== "accepted" && status !== "rejected" && (
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pending}
                  onClick={() => {
                    toast.info(t("toast.emailQueued"));
                    run(() => mutations.updateStatus.mutateAsync({ id: quote.id, status: "sent" }));
                  }}
                >
                  <Mail className="size-3.5" /> {t("actions.sendEmail")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pending}
                  onClick={() =>
                    run(() => mutations.updateStatus.mutateAsync({ id: quote.id, status: "accepted" }))
                  }
                >
                  <Check className="size-3.5" /> {t("quotes.actions.accept")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pending}
                  onClick={() =>
                    run(() => mutations.updateStatus.mutateAsync({ id: quote.id, status: "rejected" }))
                  }
                >
                  <X className="size-3.5" /> {t("quotes.actions.reject")}
                </Button>
              </div>
            )}
          </div>

          <QuotePreviewPanel
            company={{
              name: company.name,
              legalName: company.legal_name,
              taxId: company.tax_id,
              email: company.email,
              phone: company.phone,
              logoUrl: company.logo_url,
            }}
            values={{
              clientName: quote.client_name,
              clientCompany: quote.client_company ?? undefined,
              clientEmail: quote.client_email ?? undefined,
              clientPhone: quote.client_phone ?? undefined,
              clientAddress: quote.client_address ?? undefined,
              issueDate: quote.issue_date ?? undefined,
              validUntil: quote.valid_until,
              notes: quote.notes ?? undefined,
              items: quote.items?.map((i) => ({
                description: i.description,
                quantity: Number(i.quantity),
                unitPriceCents: i.unit_price_cents,
                discountPercent: Number(i.discount_percent ?? 0),
              })),
              taxRate: Number(quote.tax_rate),
              discountCents: quote.discount_cents,
            }}
            totals={{
              subtotalCents: quote.subtotal_cents,
              discountCents: quote.discount_cents,
              taxRate: Number(quote.tax_rate),
              taxCents: quote.tax_cents,
              totalCents: quote.total_cents,
            }}
            locale={locale}
          />
        </div>
      </OperationsWorkspace>
    </OperationsPage>
  );
}
