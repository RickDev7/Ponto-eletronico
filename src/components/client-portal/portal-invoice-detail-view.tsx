"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { toast } from "sonner";
import { FileDown } from "lucide-react";
import { ROUTES } from "@/config/constants";
import { formatDate, formatMoney } from "@/lib/finance/utils";
import type { InvoiceStatus } from "@/lib/finance/utils";
import { invoiceToPdfDocument } from "@/lib/finance/invoicing-engine";
import { openFinancePdf } from "@/lib/finance/pdf";
import { InvoiceStatusBadge } from "@/components/features/finance/finance-status-badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  OperationsPage,
  PageHeader,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface PortalInvoiceDetailViewProps {
  slug: string;
  invoice: Record<string, unknown>;
  company: {
    name: string;
    legal_name?: string | null;
    tax_id?: string | null;
    email?: string | null;
    phone?: string | null;
    logo_url?: string | null;
  };
  locale: string;
}

export function PortalInvoiceDetailView({
  slug,
  invoice,
  company,
  locale,
}: PortalInvoiceDetailViewProps) {
  const t = useTranslations("clientPortal.invoices");
  const ti = useTranslations("invoices");

  const items = (invoice.items as Array<Record<string, unknown>>) ?? [];
  const payments = (invoice.payments as Array<Record<string, unknown>>) ?? [];
  const contract = invoice.contract as { title: string | null } | null;
  const currency = String(invoice.currency ?? "EUR");
  const totalCents = Number(invoice.total_cents ?? 0);
  const paidCents = Number(invoice.amount_paid_cents ?? 0);

  function handlePdf() {
    const ok = openFinancePdf(
      invoiceToPdfDocument(
        invoice as never,
        {
          name: company.name,
          legalName: company.legal_name ?? null,
          taxId: company.tax_id ?? null,
          email: company.email ?? null,
          phone: company.phone ?? null,
          logoUrl: company.logo_url ?? null,
        },
        locale,
        {
          documentTitle: ti("pdf.title"),
          issueDate: ti("pdf.issueDate"),
          dueDate: ti("pdf.dueDate"),
          billTo: ti("pdf.billTo"),
          description: ti("columns.description"),
          quantity: ti("columns.qty"),
          unitPrice: ti("pdf.unitPrice"),
          lineTotal: ti("columns.total"),
          subtotal: ti("pdf.subtotal"),
          tax: ti("pdf.tax"),
          grandTotal: ti("pdf.grandTotal"),
          notes: ti("pdf.notes"),
          bankDetails: ti("pdf.bankDetails"),
        },
      ),
    );
    if (!ok) toast.error(ti("pdf.popupBlocked"));
  }

  return (
    <OperationsPage>
      <PageHeader
        title={String(invoice.invoice_number)}
        description={t("detailDescription")}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href={ROUTES.clientPortalInvoices(slug)}>
                {t("backToList")}
              </Link>
            </Button>
            <Button onClick={handlePdf}>
              <FileDown className="mr-2 size-4" />
              {ti("actions.downloadPdf")}
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t("lineItems")}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{ti("columns.description")}</TableHead>
                  <TableHead className="text-right">{ti("columns.qty")}</TableHead>
                  <TableHead className="text-right">{ti("columns.total")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={String(item.id)}>
                    <TableCell>{String(item.description)}</TableCell>
                    <TableCell className="text-right">{String(item.quantity)}</TableCell>
                    <TableCell className="text-right">
                      {formatMoney(Number(item.line_total_cents), currency, locale)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("summary")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{ti("columns.status")}</span>
                <InvoiceStatusBadge status={String(invoice.status) as InvoiceStatus} />
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{ti("columns.issueDate")}</span>
                <span>{formatDate(String(invoice.issue_date), locale)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{ti("columns.dueDate")}</span>
                <span>{formatDate(String(invoice.due_date), locale)}</span>
              </div>
              {contract ? (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{ti("columns.contract")}</span>
                  <span>{contract?.title ?? "—"}</span>
                </div>
              ) : null}
              <div className="flex justify-between font-medium">
                <span>{ti("columns.total")}</span>
                <span>{formatMoney(totalCents, currency, locale)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{ti("columns.paid")}</span>
                <span>{formatMoney(paidCents, currency, locale)}</span>
              </div>
              <div className="flex justify-between font-medium">
                <span>{ti("columns.balance")}</span>
                <span>
                  {formatMoney(totalCents - paidCents, currency, locale)}
                </span>
              </div>
            </CardContent>
          </Card>

          {payments.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>{ti("payments.title")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {payments.map((payment) => (
                  <div
                    key={String(payment.id)}
                    className="flex justify-between text-sm"
                  >
                    <span>{formatDate(String(payment.payment_date), locale)}</span>
                    <span>
                      {formatMoney(Number(payment.amount_cents), currency, locale)}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </OperationsPage>
  );
}
