"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ROUTES } from "@/config/constants";
import { formatDate, formatMoney } from "@/lib/finance/utils";
import type { PortalInvoiceRow } from "@/lib/client-portal/load-portal-data";
import {
  EmptyState,
  OperationsPage,
  PageHeader,
} from "@/components/shared";
import type { InvoiceStatus } from "@/lib/finance/utils";
import { InvoiceStatusBadge } from "@/components/features/finance/finance-status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface PortalInvoicesViewProps {
  slug: string;
  invoices: PortalInvoiceRow[];
  locale: string;
}

export function PortalInvoicesView({
  slug,
  invoices,
  locale,
}: PortalInvoicesViewProps) {
  const t = useTranslations("clientPortal.invoices");

  return (
    <OperationsPage>
      <PageHeader title={t("title")} description={t("description")} />

      {invoices.length === 0 ? (
        <EmptyState title={t("empty")} />
      ) : (
        <div className="rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("columns.number")}</TableHead>
                <TableHead>{t("columns.issueDate")}</TableHead>
                <TableHead>{t("columns.dueDate")}</TableHead>
                <TableHead className="text-right">{t("columns.amount")}</TableHead>
                <TableHead>{t("columns.status")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell>
                    <Link
                      href={ROUTES.clientPortalInvoice(slug, invoice.id)}
                      className="font-medium text-primary hover:underline"
                    >
                      {invoice.invoice_number}
                    </Link>
                  </TableCell>
                  <TableCell>{formatDate(invoice.issue_date, locale)}</TableCell>
                  <TableCell>{formatDate(invoice.due_date, locale)}</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatMoney(invoice.total_cents, invoice.currency, locale)}
                  </TableCell>
                  <TableCell>
                    <InvoiceStatusBadge status={invoice.status as InvoiceStatus} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </OperationsPage>
  );
}
