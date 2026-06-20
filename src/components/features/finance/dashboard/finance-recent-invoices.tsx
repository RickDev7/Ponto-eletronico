"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { FileDown, Mail, MoreHorizontal } from "lucide-react";
import { ROUTES } from "@/config/constants";
import { formatDate, formatMoney } from "@/lib/finance/utils";
import type { FinanceRecentInvoice } from "@/lib/finance/dashboard-data";
import { InvoiceStatusBadge } from "@/components/features/finance/finance-status-badge";
import { EmptyState } from "@/components/shared";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface FinanceRecentInvoicesProps {
  slug: string;
  invoices: FinanceRecentInvoice[];
  locale: string;
  onPdf: (invoice: FinanceRecentInvoice) => void;
}

export function FinanceRecentInvoices({
  slug,
  invoices,
  locale,
  onPdf,
}: FinanceRecentInvoicesProps) {
  const t = useTranslations("finance.dashboard");

  return (
    <div className="rounded-xl border border-border/60 bg-card">
      <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold">{t("recentInvoices.title")}</h3>
          <p className="text-xs text-muted-foreground">{t("recentInvoices.subtitle")}</p>
        </div>
        <Link
          href={ROUTES.financeInvoices(slug)}
          className="text-xs font-medium text-primary hover:underline"
        >
          {t("recentInvoices.viewAll")}
        </Link>
      </div>

      {invoices.length === 0 ? (
        <div className="p-6">
          <EmptyState title={t("recentInvoices.empty")} />
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-[11px]">{t("columns.number")}</TableHead>
              <TableHead className="text-[11px]">{t("columns.client")}</TableHead>
              <TableHead className="text-[11px] hidden sm:table-cell">{t("columns.date")}</TableHead>
              <TableHead className="text-[11px] hidden md:table-cell">{t("columns.dueDate")}</TableHead>
              <TableHead className="text-[11px]">{t("columns.amount")}</TableHead>
              <TableHead className="text-[11px]">{t("columns.status")}</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.map((inv) => (
              <TableRow key={inv.id} className="group">
                <TableCell className="font-medium text-xs">{inv.invoice_number}</TableCell>
                <TableCell className="text-xs">{inv.client_name}</TableCell>
                <TableCell className="hidden text-xs sm:table-cell">
                  {formatDate(inv.issue_date, locale)}
                </TableCell>
                <TableCell className="hidden text-xs md:table-cell">
                  {formatDate(inv.due_date, locale)}
                </TableCell>
                <TableCell className="text-xs tabular-nums">
                  {formatMoney(inv.total_cents, "EUR", locale)}
                </TableCell>
                <TableCell>
                  <InvoiceStatusBadge status={inv.status as "draft"} />
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button variant="ghost" size="icon-sm" className="opacity-0 group-hover:opacity-100">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      }
                    />
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onPdf(inv)}>
                        <FileDown className="size-3.5" /> PDF
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Mail className="size-3.5" /> {t("actions.send")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
