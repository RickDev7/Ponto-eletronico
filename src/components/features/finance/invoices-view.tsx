"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter, usePathname } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  Ban,
  Calendar,
  Check,
  Copy,
  Download,
  Eye,
  FileDown,
  Grid3X3,
  Mail,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Wallet,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { PAGINATION, ROUTES } from "@/config/constants";
import {
  formatDate,
  formatMoney,
  getMonthRange,
  monthKey,
  parseMonthKey,
} from "@/lib/finance/utils";
import {
  computeInvoiceKpis,
  computeMonthlyBuckets,
  contractTitle,
  lastPaymentMethod,
  resolveDisplayStatus,
  type InvoiceListRow,
  type InvoiceKpis,
  type RecentPaymentRow,
} from "@/lib/finance/invoices-data";
import { InvoicesKpiStrip } from "@/components/features/finance/invoices-kpi-strip";
import { InvoicesSummaryPanel } from "@/components/features/finance/invoices-summary-panel";
import { InvoicesMonthlyView } from "@/components/features/finance/invoices-monthly-view";
import { InvoicesCalendarView } from "@/components/features/finance/invoices-calendar-view";
import { InvoiceFormDialog } from "@/components/features/finance/invoice-form-dialog";
import { PaymentRecordDialog } from "@/components/features/finance/payment-record-dialog";
import { InvoiceStatusBadge } from "@/components/features/finance/finance-status-badge";
import { openFinancePdf, type PdfDocumentData } from "@/lib/finance/pdf";
import { useInvoiceMutations } from "@/hooks/use-invoice-mutations";
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
import { cn } from "@/lib/utils";
import type { InvoiceStatus } from "@/lib/finance/utils";

type ViewMode = "table" | "calendar" | "monthly";

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

interface InvoicesViewProps {
  slug: string;
  invoices: InvoiceListRow[];
  yearInvoices: InvoiceListRow[];
  month: string;
  previousMonthRevenueCents: number;
  projectedRevenueCents: number;
  dueThisWeek: InvoiceListRow[];
  overdueInvoices: InvoiceListRow[];
  recentPayments: RecentPaymentRow[];
  clients: ClientOption[];
  contracts: ContractOption[];
  locale: string;
  company: {
    name: string;
    legal_name: string | null;
    tax_id: string | null;
    email: string | null;
    phone: string | null;
    logo_url: string | null;
  };
  defaultBankDetails?: string;
  canWrite: boolean;
}

export function InvoicesView(props: InvoicesViewProps) {
  const {
    slug,
    invoices,
    yearInvoices,
    month,
    previousMonthRevenueCents,
    projectedRevenueCents,
    dueThisWeek,
    overdueInvoices,
    recentPayments,
    clients,
    contracts,
    locale,
    company,
    defaultBankDetails,
    canWrite,
  } = props;

  const t = useTranslations("finance");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const mutations = useInvoiceMutations(slug);

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [clientFilter, setClientFilter] = useState("all");
  const [contractFilter, setContractFilter] = useState("all");
  const [methodFilter, setMethodFilter] = useState("all");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [formOpen, setFormOpen] = useState(false);
  const [paymentInvoice, setPaymentInvoice] = useState<InvoiceListRow | null>(null);

  const initialClientId = searchParams.get("clientId");

  useEffect(() => {
    if (searchParams.get("create") === "1" && canWrite) {
      setFormOpen(true);
    }
  }, [searchParams, canWrite]);

  const { year, month: monthNum } = parseMonthKey(month);
  const monthLabel = new Date(year, monthNum - 1, 1).toLocaleDateString(locale, {
    month: "long",
    year: "numeric",
  });

  const kpis: InvoiceKpis = useMemo(
    () => computeInvoiceKpis(invoices, previousMonthRevenueCents, projectedRevenueCents),
    [invoices, previousMonthRevenueCents, projectedRevenueCents],
  );

  const monthlyBuckets = useMemo(
    () => computeMonthlyBuckets(yearInvoices, year, locale),
    [yearInvoices, year, locale],
  );

  const filtered = useMemo(() => {
    return invoices.filter((inv) => {
      const q = query.toLowerCase();
      const matchesQuery =
        !query ||
        inv.invoice_number.toLowerCase().includes(q) ||
        inv.client_name.toLowerCase().includes(q) ||
        (inv.client_company?.toLowerCase().includes(q) ?? false) ||
        (inv.client_email?.toLowerCase().includes(q) ?? false);

      const displayStatus = resolveDisplayStatus(inv.status, inv.due_date);
      const matchesStatus = statusFilter === "all" || displayStatus === statusFilter || inv.status === statusFilter;
      const matchesClient = clientFilter === "all" || inv.client_id === clientFilter;
      const matchesContract = contractFilter === "all" || inv.contract_id === contractFilter;
      const method = lastPaymentMethod(inv);
      const matchesMethod = methodFilter === "all" || method === methodFilter;

      const minCents = minAmount ? Math.round(Number(minAmount) * 100) : 0;
      const maxCents = maxAmount ? Math.round(Number(maxAmount) * 100) : Infinity;
      const matchesAmount = inv.total_cents >= minCents && inv.total_cents <= maxCents;

      return (
        matchesQuery &&
        matchesStatus &&
        matchesClient &&
        matchesContract &&
        matchesMethod &&
        matchesAmount
      );
    });
  }, [invoices, query, statusFilter, clientFilter, contractFilter, methodFilter, minAmount, maxAmount]);

  const pageSize = PAGINATION.defaultPageSize;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  function shiftMonth(delta: number) {
    const d = new Date(year, monthNum - 1 + delta, 1);
    const params = new URLSearchParams(searchParams.toString());
    params.set("month", monthKey(d));
    router.push(`${pathname}?${params.toString()}`);
  }

  function selectMonth(key: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("month", key);
    router.push(`${pathname}?${params.toString()}`);
    setViewMode("table");
  }

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

  function handlePdf(inv: InvoiceListRow) {
    openFinancePdf({
      type: "invoice",
      number: inv.invoice_number,
      company: {
        name: company.name,
        legalName: company.legal_name,
        taxId: company.tax_id,
        email: company.email,
        phone: company.phone,
        logoUrl: company.logo_url,
      },
      clientName: inv.client_name,
      clientCompany: inv.client_company,
      clientEmail: inv.client_email,
      issueDate: inv.issue_date,
      dueDate: inv.due_date,
      items: (inv.items ?? []).map((i) => ({
        description: i.description,
        quantity: Number(i.quantity),
        unitPriceCents: i.unit_price_cents,
        lineTotalCents: i.line_total_cents,
      })),
      subtotalCents: inv.subtotal_cents,
      taxRate: Number(inv.tax_rate),
      taxCents: inv.tax_cents,
      totalCents: inv.total_cents,
      notes: inv.notes,
      bankDetails: inv.bank_details,
      locale,
      labels: pdfLabels(),
    });
  }

  function run(fn: () => Promise<{ success: boolean; error?: string }>, msg?: string) {
    startTransition(async () => {
      const r = await fn();
      if (!r.success) toast.error(r.error);
      else toast.success(msg ?? t("toast.saved"));
    });
  }

  function exportCsv(rows: InvoiceListRow[]) {
    const header = [
      t("columns.number"),
      t("columns.client"),
      t("columns.issueDate"),
      t("columns.dueDate"),
      t("columns.amount"),
      t("columns.status"),
    ].join(",");
    const lines = rows.map((inv) =>
      [
        inv.invoice_number,
        `"${inv.client_name}"`,
        inv.issue_date,
        inv.due_date,
        (inv.total_cents / 100).toFixed(2),
        resolveDisplayStatus(inv.status, inv.due_date),
      ].join(","),
    );
    const blob = new Blob([[header, ...lines].join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `invoices-${month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const viewButtons: Array<{ mode: ViewMode; icon: typeof Grid3X3; label: string }> = [
    { mode: "table", icon: Grid3X3, label: t("invoices.views.table") },
    { mode: "calendar", icon: Calendar, label: t("invoices.views.calendar") },
    { mode: "monthly", icon: Calendar, label: t("invoices.views.monthly") },
  ];

  return (
    <OperationsPage>
      <PageHeader
        title={t("invoices.title")}
        description={t("invoices.listDescription")}
        actions={
          <div className="flex flex-wrap gap-2">
            {canWrite && (
              <>
                <Button size="sm" onClick={() => setFormOpen(true)}>
                  <Plus className="size-3.5" /> {t("invoices.new")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      const result = await mutations.generateRecurring.mutateAsync();
                      if (!result.success) toast.error(result.error);
                      else toast.success(t("toast.invoicesGenerated", { count: result.data.count }));
                    })
                  }
                >
                  <RefreshCw className="size-3.5" /> {t("invoices.generate")}
                </Button>
              </>
            )}
            <Button variant="outline" size="sm" onClick={() => exportCsv(filtered)}>
              <Download className="size-3.5" /> {t("invoices.export")}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="outline" size="sm">
                    <MoreHorizontal className="size-3.5" /> {t("invoices.moreActions")}
                  </Button>
                }
              />
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => exportCsv(invoices)}>
                  {t("invoices.exportMonth")}
                </DropdownMenuItem>
                {selected.size > 0 && canWrite && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => {
                        for (const id of selected) {
                          run(() =>
                            mutations.updateStatus.mutateAsync({ id, status: "sent" as InvoiceStatus }),
                          );
                        }
                        setSelected(new Set());
                      }}
                    >
                      {t("invoices.bulkMarkSent")}
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
      />

      <InvoicesKpiStrip
        kpis={kpis}
        locale={locale}
        labels={{
          monthlyRevenue: t("invoices.kpi.monthlyRevenue"),
          issued: t("invoices.kpi.issued"),
          pending: t("invoices.kpi.pending"),
          paid: t("invoices.kpi.paid"),
          overdue: t("invoices.kpi.overdue"),
          projected: t("invoices.kpi.projected"),
          vsPrevious: t("invoices.kpi.vsPrevious"),
        }}
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_280px]">
        <OperationsWorkspace>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon-sm" onClick={() => shiftMonth(-1)}>
                <ChevronLeft className="size-4" />
              </Button>
              <span className="min-w-[140px] text-center text-sm font-semibold capitalize">{monthLabel}</span>
              <Button variant="outline" size="icon-sm" onClick={() => shiftMonth(1)}>
                <ChevronRight className="size-4" />
              </Button>
            </div>
            <div className="flex rounded-lg border border-border/60 p-0.5">
              {viewButtons.map(({ mode, icon: Icon, label }) => (
                <button
                  key={mode}
                  type="button"
                  suppressHydrationWarning
                  onClick={() => setViewMode(mode)}
                  className={cn(
                    "flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                    viewMode === mode
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className="size-3.5" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {viewMode === "table" && (
            <>
              <OperationsFilterBar>
                <div className="relative min-w-[200px] flex-1">
                  <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={query}
                    onChange={(e) => { setQuery(e.target.value); setPage(1); }}
                    placeholder={t("invoices.searchPlaceholder")}
                    className="h-8 pl-8 text-xs"
                  />
                </div>
                <select suppressHydrationWarning value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-8 rounded-md border border-input bg-background px-2 text-xs">
                  <option value="all">{t("filters.all")}</option>
                  {(["draft", "sent", "paid", "partial", "overdue", "cancelled"] as const).map((s) => (
                    <option key={s} value={s}>{t(`status.invoice.${s}`)}</option>
                  ))}
                </select>
                <select suppressHydrationWarning value={clientFilter} onChange={(e) => setClientFilter(e.target.value)} className="h-8 rounded-md border border-input bg-background px-2 text-xs">
                  <option value="all">{t("columns.client")}</option>
                  {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <select suppressHydrationWarning value={contractFilter} onChange={(e) => setContractFilter(e.target.value)} className="h-8 rounded-md border border-input bg-background px-2 text-xs">
                  <option value="all">{t("invoices.columns.contract")}</option>
                  {contracts.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
                <select suppressHydrationWarning value={methodFilter} onChange={(e) => setMethodFilter(e.target.value)} className="h-8 rounded-md border border-input bg-background px-2 text-xs">
                  <option value="all">{t("columns.method")}</option>
                  {(["bank_transfer", "cash", "card", "other"] as const).map((m) => (
                    <option key={m} value={m}>{t(`paymentMethod.${m}`)}</option>
                  ))}
                </select>
                <Input type="number" placeholder={t("quotes.filters.minAmount")} value={minAmount} onChange={(e) => setMinAmount(e.target.value)} className="h-8 w-20 text-xs" />
                <Input type="number" placeholder={t("quotes.filters.maxAmount")} value={maxAmount} onChange={(e) => setMaxAmount(e.target.value)} className="h-8 w-20 text-xs" />
              </OperationsFilterBar>

              {filtered.length === 0 ? (
                <EmptyState title={t("invoices.empty")} description={t("invoices.emptyHint")} />
              ) : (
                <>
                  <div className="overflow-x-auto rounded-xl border border-border/60">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {canWrite && <TableHead className="w-8" />}
                          <TableHead>{t("columns.number")}</TableHead>
                          <TableHead>{t("columns.client")}</TableHead>
                          <TableHead>{t("invoices.columns.contract")}</TableHead>
                          <TableHead>{t("columns.issueDate")}</TableHead>
                          <TableHead>{t("columns.dueDate")}</TableHead>
                          <TableHead>{t("columns.amount")}</TableHead>
                          <TableHead>{t("columns.status")}</TableHead>
                          <TableHead>{t("columns.method")}</TableHead>
                          <TableHead>{t("invoices.columns.updated")}</TableHead>
                          <TableHead className="w-12" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginated.map((inv) => {
                          const method = lastPaymentMethod(inv);
                          const display = resolveDisplayStatus(inv.status, inv.due_date);
                          return (
                            <TableRow key={inv.id} className="hover:bg-muted/30">
                              {canWrite && (
                                <TableCell>
                                  <input
                                    type="checkbox"
                                    checked={selected.has(inv.id)}
                                    onChange={() => toggleSelect(inv.id)}
                                    className="size-3.5 rounded border-input"
                                  />
                                </TableCell>
                              )}
                              <TableCell className="font-medium">
                                <Link
                                  href={ROUTES.financeInvoice(slug, inv.id)}
                                  className="hover:text-primary hover:underline"
                                >
                                  {inv.invoice_number}
                                </Link>
                              </TableCell>
                              <TableCell>{inv.client_name}</TableCell>
                              <TableCell className="text-muted-foreground">{contractTitle(inv)}</TableCell>
                              <TableCell>{formatDate(inv.issue_date, locale)}</TableCell>
                              <TableCell>{formatDate(inv.due_date, locale)}</TableCell>
                              <TableCell className="tabular-nums">{formatMoney(inv.total_cents, "EUR", locale)}</TableCell>
                              <TableCell><InvoiceStatusBadge status={display} /></TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                {method ? t(`paymentMethod.${method as "bank_transfer"}`) : "—"}
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                {formatDate(inv.updated_at, locale)}
                              </TableCell>
                              <TableCell>
                                <DropdownMenu>
                                  <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" disabled={pending}><MoreHorizontal className="size-4" /></Button>} />
                                  <DropdownMenuContent align="end" className="min-w-44">
                                    <DropdownMenuItem onClick={() => router.push(ROUTES.financeInvoice(slug, inv.id))}>
                                      <Eye className="size-3.5" /> {t("actions.view")}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handlePdf(inv)}>
                                      <FileDown className="size-3.5" /> {t("actions.pdf")}
                                    </DropdownMenuItem>
                                    {canWrite && (
                                      <>
                                        <DropdownMenuItem onClick={() => run(() => mutations.duplicate.mutateAsync(inv.id))}>
                                          <Copy className="size-3.5" /> {t("actions.duplicate")}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => { toast.info(t("toast.emailQueued")); run(() => mutations.updateStatus.mutateAsync({ id: inv.id, status: "sent" })); }}>
                                          <Mail className="size-3.5" /> {t("actions.sendEmail")}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => setPaymentInvoice(inv)}>
                                          <Wallet className="size-3.5" /> {t("invoices.actions.recordPayment")}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => run(() => mutations.updateStatus.mutateAsync({ id: inv.id, status: "paid" }))}>
                                          <Check className="size-3.5" /> {t("invoices.actions.markPaid")}
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={() => run(() => mutations.updateStatus.mutateAsync({ id: inv.id, status: "cancelled" }))}>
                                          <Ban className="size-3.5" /> {t("invoices.actions.cancel")}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => run(() => mutations.remove.mutateAsync(inv.id), t("toast.invoiceDeleted"))}>
                                          <Trash2 className="size-3.5" /> {t("invoices.actions.delete")}
                                        </DropdownMenuItem>
                                      </>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between pt-3 text-xs text-muted-foreground">
                      <span>{t("quotes.pagination", { from: (page - 1) * pageSize + 1, to: Math.min(page * pageSize, filtered.length), total: filtered.length })}</span>
                      <div className="flex gap-1">
                        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>{t("quotes.prev")}</Button>
                        <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>{t("quotes.next")}</Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {viewMode === "calendar" && (
            <InvoicesCalendarView invoices={invoices} month={month} locale={locale} />
          )}

          {viewMode === "monthly" && (
            <InvoicesMonthlyView
              buckets={monthlyBuckets}
              activeMonth={month}
              locale={locale}
              onSelectMonth={selectMonth}
            />
          )}
        </OperationsWorkspace>

        <InvoicesSummaryPanel
          locale={locale}
          monthlyRevenueCents={kpis.monthlyRevenueCents}
          projectedRevenueCents={kpis.projectedRevenueCents}
          dueThisWeek={dueThisWeek}
          overdueInvoices={overdueInvoices}
          recentPayments={recentPayments}
        />
      </div>

      <InvoiceFormDialog
        slug={slug}
        locale={locale}
        open={formOpen}
        onOpenChange={setFormOpen}
        clients={clients}
        contracts={contracts}
        defaultBankDetails={defaultBankDetails}
        initialClientId={initialClientId}
      />

      <PaymentRecordDialog
        slug={slug}
        locale={locale}
        invoice={paymentInvoice}
        open={Boolean(paymentInvoice)}
        onOpenChange={(o) => !o && setPaymentInvoice(null)}
      />
    </OperationsPage>
  );
}
