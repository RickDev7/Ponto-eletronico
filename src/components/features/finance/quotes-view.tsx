"use client";

import { useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import {
  Check,
  Copy,
  Download,
  Eye,
  FileDown,
  Mail,
  MoreHorizontal,
  Pencil,
  Plus,
  ScrollText,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { ROUTES } from "@/config/constants";
import { PAGINATION } from "@/config/constants";
import { formatDate, formatMoney } from "@/lib/finance/utils";
import {
  displayStatus,
  type QuoteListRow,
} from "@/lib/finance/quotes-data";
import { QuotesKpiStrip, computeQuotesKpis } from "@/components/features/finance/quotes-kpi-strip";
import { QuoteStatusBadge } from "@/components/features/finance/finance-status-badge";
import { openFinancePdf, type PdfDocumentData } from "@/lib/finance/pdf";
import { useQuoteMutations } from "@/hooks/use-quote-mutations";
import {
  EmptyState,
  OperationsFilterBar,
  OperationsPage,
  OperationsWorkspace,
  PageHeader,
} from "@/components/shared";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface CompanyPdf {
  name: string;
  legal_name: string | null;
  tax_id: string | null;
  email: string | null;
  phone: string | null;
  logo_url: string | null;
}

interface MemberOption {
  id: string;
  full_name: string | null;
}

interface QuotesViewProps {
  slug: string;
  quotes: QuoteListRow[];
  company: CompanyPdf;
  members: MemberOption[];
  locale: string;
  canWrite: boolean;
}

export function QuotesView({
  slug,
  quotes,
  company,
  members,
  locale,
  canWrite,
}: QuotesViewProps) {
  const t = useTranslations("finance");
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [periodFrom, setPeriodFrom] = useState("");
  const [periodTo, setPeriodTo] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [page, setPage] = useState(1);
  const [pending, startTransition] = useTransition();
  const mutations = useQuoteMutations(slug);

  const kpis = useMemo(() => computeQuotesKpis(quotes), [quotes]);

  const filtered = useMemo(() => {
    return quotes.filter((q) => {
      const qLower = query.toLowerCase();
      const matchesQuery =
        !query ||
        q.quote_number.toLowerCase().includes(qLower) ||
        q.client_name.toLowerCase().includes(qLower) ||
        (q.client_company?.toLowerCase().includes(qLower) ?? false);

      const ds = displayStatus(q);
      const matchesStatus = statusFilter === "all" || ds === statusFilter || q.status === statusFilter;

      const matchesAssignee =
        assigneeFilter === "all" ||
        q.assigned_to === assigneeFilter ||
        q.created_by === assigneeFilter;

      const issueDate = q.issue_date ?? q.created_at.slice(0, 10);
      const matchesFrom = !periodFrom || issueDate >= periodFrom;
      const matchesTo = !periodTo || issueDate <= periodTo;

      const minCents = minAmount ? Math.round(Number(minAmount) * 100) : 0;
      const maxCents = maxAmount ? Math.round(Number(maxAmount) * 100) : Infinity;
      const matchesAmount = q.total_cents >= minCents && q.total_cents <= maxCents;

      return (
        matchesQuery &&
        matchesStatus &&
        matchesAssignee &&
        matchesFrom &&
        matchesTo &&
        matchesAmount
      );
    });
  }, [quotes, query, statusFilter, assigneeFilter, periodFrom, periodTo, minAmount, maxAmount]);

  const pageSize = PAGINATION.defaultPageSize;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

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

  function handlePdf(quote: QuoteListRow) {
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

  function runMutation(
    fn: () => Promise<{ success: boolean; error?: string }>,
    successMsg?: string,
  ) {
    startTransition(async () => {
      const result = await fn();
      if (!result.success) toast.error(result.error);
      else toast.success(successMsg ?? t("toast.saved"));
    });
  }

  function exportCsv() {
    const header = [
      t("columns.number"),
      t("columns.client"),
      t("columns.company"),
      t("columns.date"),
      t("columns.validUntil"),
      t("columns.amount"),
      t("columns.status"),
    ].join(",");

    const rows = filtered.map((q) =>
      [
        q.quote_number,
        `"${q.client_name}"`,
        `"${q.client_company ?? ""}"`,
        q.issue_date ?? q.created_at.slice(0, 10),
        q.valid_until ?? "",
        (q.total_cents / 100).toFixed(2),
        displayStatus(q),
      ].join(","),
    );

    const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `quotes-${slug}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <OperationsPage>
      <PageHeader
        title={t("quotes.title")}
        description={t("quotes.listDescription")}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={exportCsv}>
              <Download className="size-3.5" />
              {t("quotes.export")}
            </Button>
            {canWrite && (
              <Link
                href={ROUTES.financeQuotesNew(slug)}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground"
              >
                <Plus className="size-3.5" />
                {t("quotes.new")}
              </Link>
            )}
          </div>
        }
      />

      <QuotesKpiStrip
        kpis={kpis}
        locale={locale}
        labels={{
          total: t("quotes.kpi.total"),
          underReview: t("quotes.kpi.underReview"),
          accepted: t("quotes.kpi.accepted"),
          rejected: t("quotes.kpi.rejected"),
          potential: t("quotes.kpi.potential"),
          conversion: t("quotes.kpi.conversion"),
        }}
      />

      <OperationsWorkspace>
        <OperationsFilterBar>
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder={t("quotes.searchPlaceholder")}
              className="h-8 pl-8 text-xs"
            />
          </div>
          <select
            suppressHydrationWarning
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="h-8 rounded-md border border-input bg-background px-2 text-xs"
          >
            <option value="all">{t("filters.all")}</option>
            <option value="draft">{t("status.quote.draft")}</option>
            <option value="sent">{t("status.quote.sent")}</option>
            <option value="under_review">{t("status.quote.under_review")}</option>
            <option value="accepted">{t("status.quote.accepted")}</option>
            <option value="rejected">{t("status.quote.rejected")}</option>
            <option value="expired">{t("status.quote.expired")}</option>
          </select>
          <select
            suppressHydrationWarning
            value={assigneeFilter}
            onChange={(e) => {
              setAssigneeFilter(e.target.value);
              setPage(1);
            }}
            className="h-8 rounded-md border border-input bg-background px-2 text-xs"
          >
            <option value="all">{t("quotes.filters.assignee")}</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.full_name ?? m.id.slice(0, 8)}
              </option>
            ))}
          </select>
          <Input
            type="date"
            value={periodFrom}
            onChange={(e) => setPeriodFrom(e.target.value)}
            className="h-8 w-[130px] text-xs"
            aria-label={t("quotes.filters.periodFrom")}
          />
          <Input
            type="date"
            value={periodTo}
            onChange={(e) => setPeriodTo(e.target.value)}
            className="h-8 w-[130px] text-xs"
            aria-label={t("quotes.filters.periodTo")}
          />
          <Input
            type="number"
            placeholder={t("quotes.filters.minAmount")}
            value={minAmount}
            onChange={(e) => setMinAmount(e.target.value)}
            className="h-8 w-24 text-xs"
          />
          <Input
            type="number"
            placeholder={t("quotes.filters.maxAmount")}
            value={maxAmount}
            onChange={(e) => setMaxAmount(e.target.value)}
            className="h-8 w-24 text-xs"
          />
        </OperationsFilterBar>

        {filtered.length === 0 ? (
          <EmptyState title={t("quotes.empty")} description={t("quotes.emptyHint")} />
        ) : (
          <>
            <div className="overflow-x-auto rounded-xl border border-border/60">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("columns.number")}</TableHead>
                    <TableHead>{t("columns.client")}</TableHead>
                    <TableHead>{t("columns.company")}</TableHead>
                    <TableHead>{t("columns.date")}</TableHead>
                    <TableHead>{t("columns.validUntil")}</TableHead>
                    <TableHead>{t("columns.amount")}</TableHead>
                    <TableHead>{t("columns.status")}</TableHead>
                    <TableHead>{t("quotes.columns.assignee")}</TableHead>
                    <TableHead>{t("quotes.columns.updated")}</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.map((quote) => (
                    <TableRow key={quote.id} className="hover:bg-muted/30">
                        <TableCell>
                          <Link
                            href={ROUTES.financeQuote(slug, quote.id)}
                            className="font-medium text-foreground hover:underline"
                          >
                            {quote.quote_number}
                          </Link>
                        </TableCell>
                        <TableCell>{quote.client_name}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {quote.client_company ?? "—"}
                        </TableCell>
                        <TableCell>
                          {formatDate(quote.issue_date ?? quote.created_at, locale)}
                        </TableCell>
                        <TableCell>
                          {quote.valid_until ? formatDate(quote.valid_until, locale) : "—"}
                        </TableCell>
                        <TableCell className="tabular-nums">
                          {formatMoney(quote.total_cents, "EUR", locale)}
                        </TableCell>
                        <TableCell>
                          <QuoteStatusBadge status={displayStatus(quote)} />
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {members.find((m) => m.id === (quote.assigned_to ?? quote.created_by))?.full_name ?? "—"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDate(quote.updated_at, locale)}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              render={
                                <Button variant="ghost" size="icon-sm" disabled={pending}>
                                  <MoreHorizontal className="size-4" />
                                </Button>
                              }
                            />
                            <DropdownMenuContent align="end" className="min-w-44">
                              <DropdownMenuItem onClick={() => router.push(ROUTES.financeQuote(slug, quote.id))}>
                                <Eye className="size-3.5" />
                                {t("quotes.actions.view")}
                              </DropdownMenuItem>
                              {canWrite && (
                                <>
                                  <DropdownMenuItem onClick={() => router.push(ROUTES.financeQuoteEdit(slug, quote.id))}>
                                    <Pencil className="size-3.5" />
                                    {t("quotes.actions.edit")}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() =>
                                      runMutation(
                                        () => mutations.duplicateQuote.mutateAsync(quote.id),
                                        t("toast.saved"),
                                      )
                                    }
                                  >
                                    <Copy className="size-3.5" />
                                    {t("actions.duplicate")}
                                  </DropdownMenuItem>
                                </>
                              )}
                              <DropdownMenuItem onClick={() => handlePdf(quote)}>
                                <FileDown className="size-3.5" />
                                {t("actions.pdf")}
                              </DropdownMenuItem>
                              {canWrite && (
                                <>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      toast.info(t("toast.emailQueued"));
                                      runMutation(
                                        () =>
                                          mutations.updateStatus.mutateAsync({
                                            id: quote.id,
                                            status: "sent",
                                          }),
                                      );
                                    }}
                                  >
                                    <Mail className="size-3.5" />
                                    {t("actions.sendEmail")}
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() =>
                                      runMutation(
                                        () =>
                                          mutations.updateStatus.mutateAsync({
                                            id: quote.id,
                                            status: "accepted",
                                          }),
                                        t("toast.saved"),
                                      )
                                    }
                                  >
                                    <Check className="size-3.5" />
                                    {t("quotes.actions.accept")}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() =>
                                      runMutation(
                                        () =>
                                          mutations.updateStatus.mutateAsync({
                                            id: quote.id,
                                            status: "rejected",
                                          }),
                                        t("toast.saved"),
                                      )
                                    }
                                  >
                                    <X className="size-3.5" />
                                    {t("quotes.actions.reject")}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() =>
                                      runMutation(
                                        () => mutations.convertToContract.mutateAsync(quote.id),
                                        t("toast.contractCreated"),
                                      )
                                    }
                                  >
                                    <ScrollText className="size-3.5" />
                                    {t("actions.convertContract")}
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-destructive focus:text-destructive"
                                    onClick={() =>
                                      runMutation(
                                        () => mutations.removeQuote.mutateAsync(quote.id),
                                        t("toast.quoteDeleted"),
                                      )
                                    }
                                  >
                                    <Trash2 className="size-3.5" />
                                    {t("quotes.actions.delete")}
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-3 text-xs text-muted-foreground">
                <span>
                  {t("quotes.pagination", {
                    from: (page - 1) * pageSize + 1,
                    to: Math.min(page * pageSize, filtered.length),
                    total: filtered.length,
                  })}
                </span>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    {t("quotes.prev")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    {t("quotes.next")}
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </OperationsWorkspace>
    </OperationsPage>
  );
}
