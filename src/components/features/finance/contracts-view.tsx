"use client";

import { useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import {
  Copy,
  Download,
  Eye,
  FileDown,
  MoreHorizontal,
  Pause,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { ROUTES, PAGINATION } from "@/config/constants";
import { formatDate, formatMoney } from "@/lib/finance/utils";
import {
  clientName,
  resolveContractStatus,
  type ContractListRow,
} from "@/lib/finance/contracts-data";
import {
  ContractsKpiStrip,
  computeContractsKpis,
} from "@/components/features/finance/contracts-kpi-strip";
import { ContractStatusBadge } from "@/components/features/finance/finance-status-badge";
import { openFinancePdf, type PdfDocumentData } from "@/lib/finance/pdf";
import {
  duplicateContractAction,
  deleteContractAction,
  generateRecurringInvoicesAction,
  updateContractStatusAction,
} from "@/actions/finance/actions";
import { useContractMutations } from "@/hooks/use-contract-mutations";
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
import { Checkbox } from "@/components/ui/checkbox";

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

interface ContractsViewProps {
  slug: string;
  contracts: ContractListRow[];
  company: CompanyPdf;
  members: MemberOption[];
  locale: string;
  canWrite: boolean;
}

export function ContractsView({
  slug,
  contracts,
  company,
  members,
  locale,
  canWrite,
}: ContractsViewProps) {
  const t = useTranslations("finance");
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [frequencyFilter, setFrequencyFilter] = useState("all");
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [startFrom, setStartFrom] = useState("");
  const [startTo, setStartTo] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();
  const mutations = useContractMutations(slug);

  const kpis = useMemo(() => computeContractsKpis(contracts), [contracts]);

  const filtered = useMemo(() => {
    return contracts.filter((c) => {
      const qLower = query.toLowerCase();
      const name = clientName(c);
      const matchesQuery =
        !query ||
        (c.contract_number?.toLowerCase().includes(qLower) ?? false) ||
        name.toLowerCase().includes(qLower) ||
        c.title.toLowerCase().includes(qLower) ||
        (c.service_description?.toLowerCase().includes(qLower) ?? false);

      const status = resolveContractStatus(c);
      const matchesStatus = statusFilter === "all" || status === statusFilter;
      const matchesFrequency = frequencyFilter === "all" || c.frequency === frequencyFilter;
      const matchesAssignee =
        assigneeFilter === "all" || c.assigned_to === assigneeFilter;

      const matchesStartFrom = !startFrom || c.start_date >= startFrom;
      const matchesStartTo = !startTo || c.start_date <= startTo;

      const amount = c.total_cents ?? c.amount_cents;
      const minCents = minAmount ? Math.round(Number(minAmount) * 100) : 0;
      const maxCents = maxAmount ? Math.round(Number(maxAmount) * 100) : Infinity;
      const matchesAmount = amount >= minCents && amount <= maxCents;

      return (
        matchesQuery &&
        matchesStatus &&
        matchesFrequency &&
        matchesAssignee &&
        matchesStartFrom &&
        matchesStartTo &&
        matchesAmount
      );
    });
  }, [
    contracts,
    query,
    statusFilter,
    frequencyFilter,
    assigneeFilter,
    startFrom,
    startTo,
    minAmount,
    maxAmount,
  ]);

  const pageSize = PAGINATION.defaultPageSize;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

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

  function handlePdf(contract: ContractListRow) {
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
      locale,
      labels: pdfLabels(),
    });
  }

  function runMutation(
    fn: () => Promise<{ success: boolean; error?: string; data?: { id?: string; count?: number } }>,
    successMsg?: string,
    onSuccess?: (data?: { id?: string; count?: number }) => void,
  ) {
    startTransition(async () => {
      const result = await fn();
      if (!result.success) toast.error(result.error);
      else {
        toast.success(successMsg ?? t("toast.saved"));
        onSuccess?.(result.data);
      }
    });
  }

  function exportCsv() {
    const header = [
      t("columns.number"),
      t("columns.client"),
      t("columns.service"),
      t("columns.amount"),
      t("columns.frequency"),
      t("columns.startDate"),
      t("contracts.columns.nextBilling"),
      t("columns.endDate"),
      t("columns.status"),
    ].join(",");

    const rows = filtered.map((c) =>
      [
        c.contract_number ?? "",
        `"${clientName(c)}"`,
        `"${c.title}"`,
        ((c.total_cents ?? c.amount_cents) / 100).toFixed(2),
        c.frequency,
        c.start_date,
        c.next_invoice_date ?? "",
        c.end_date ?? "",
        resolveContractStatus(c),
      ].join(","),
    );

    const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `contracts-${slug}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function toggleAll(checked: boolean) {
    if (checked) setSelected(new Set(paginated.map((c) => c.id)));
    else setSelected(new Set());
  }

  function toggleOne(id: string, checked: boolean) {
    const next = new Set(selected);
    if (checked) next.add(id);
    else next.delete(id);
    setSelected(next);
  }

  function bulkSuspend() {
    for (const id of selected) {
      mutations.updateStatus.mutate({ id, status: "suspended" });
    }
    setSelected(new Set());
    toast.success(t("toast.saved"));
  }

  return (
    <OperationsPage>
      <PageHeader
        title={t("contracts.title")}
        description={t("contracts.listDescription")}
        actions={
          <div className="flex flex-wrap gap-2">
            {canWrite && (
              <Button
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={() =>
                  runMutation(
                    () => generateRecurringInvoicesAction(slug),
                    t("toast.invoicesGenerated", { count: 0 }),
                  )
                }
              >
                <RefreshCw className="size-3.5" />
                {t("contracts.generateInvoices")}
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={exportCsv}>
              <Download className="size-3.5" />
              {t("contracts.export")}
            </Button>
            <Button variant="outline" size="sm" onClick={() => toast.info(t("contracts.importSoon"))}>
              <Upload className="size-3.5" />
              {t("contracts.import")}
            </Button>
            {canWrite && (
              <Link
                href={ROUTES.financeContractsNew(slug)}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-medium text-primary-foreground"
              >
                <Plus className="size-3.5" />
                {t("contracts.new")}
              </Link>
            )}
          </div>
        }
      />

      <ContractsKpiStrip
        kpis={kpis}
        locale={locale}
        labels={{
          active: t("contracts.kpi.active"),
          mrr: t("contracts.kpi.mrr"),
          arr: t("contracts.kpi.arr"),
          renewals: t("contracts.kpi.renewals"),
          expiring: t("contracts.kpi.expiring"),
          forecast12m: t("contracts.kpi.forecast12m"),
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
              placeholder={t("contracts.searchPlaceholder")}
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
            {(
              ["active", "pending", "suspended", "expired", "cancelled", "renewing"] as const
            ).map((s) => (
              <option key={s} value={s}>
                {t(`status.contract.${s}`)}
              </option>
            ))}
          </select>
          <select
            suppressHydrationWarning
            value={frequencyFilter}
            onChange={(e) => setFrequencyFilter(e.target.value)}
            className="h-8 rounded-md border border-input bg-background px-2 text-xs"
          >
            <option value="all">{t("columns.frequency")}</option>
            {(["monthly", "bimonthly", "quarterly", "semiannual", "annual"] as const).map(
              (f) => (
                <option key={f} value={f}>
                  {t(`frequency.${f}`)}
                </option>
              ),
            )}
          </select>
          <select
            suppressHydrationWarning
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
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
            value={startFrom}
            onChange={(e) => setStartFrom(e.target.value)}
            className="h-8 w-[130px] text-xs"
            aria-label={t("columns.startDate")}
          />
          <Input
            type="date"
            value={startTo}
            onChange={(e) => setStartTo(e.target.value)}
            className="h-8 w-[130px] text-xs"
            aria-label={t("columns.endDate")}
          />
          <Input
            type="number"
            placeholder={t("quotes.filters.minAmount")}
            value={minAmount}
            onChange={(e) => setMinAmount(e.target.value)}
            className="h-8 w-20 text-xs"
          />
          <Input
            type="number"
            placeholder={t("quotes.filters.maxAmount")}
            value={maxAmount}
            onChange={(e) => setMaxAmount(e.target.value)}
            className="h-8 w-20 text-xs"
          />
        </OperationsFilterBar>

        {selected.size > 0 && canWrite && (
          <div className="mb-3 flex items-center gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-xs">
            <span>{t("contracts.bulkSelected", { count: selected.size })}</span>
            <Button size="sm" variant="outline" onClick={bulkSuspend}>
              <Pause className="size-3.5" />
              {t("contracts.actions.suspend")}
            </Button>
          </div>
        )}

        {filtered.length === 0 ? (
          <EmptyState title={t("contracts.empty")} description={t("contracts.emptyHint")} />
        ) : (
          <>
            <div className="overflow-x-auto rounded-xl border border-border/60">
              <Table>
                <TableHeader>
                  <TableRow>
                    {canWrite && (
                      <TableHead className="w-10">
                        <Checkbox
                          checked={
                            paginated.length > 0 && paginated.every((c) => selected.has(c.id))
                          }
                          onCheckedChange={(v) => toggleAll(Boolean(v))}
                        />
                      </TableHead>
                    )}
                    <TableHead>{t("columns.number")}</TableHead>
                    <TableHead>{t("columns.client")}</TableHead>
                    <TableHead>{t("columns.service")}</TableHead>
                    <TableHead className="text-right">{t("columns.amount")}</TableHead>
                    <TableHead>{t("columns.frequency")}</TableHead>
                    <TableHead>{t("columns.startDate")}</TableHead>
                    <TableHead>{t("contracts.columns.nextBilling")}</TableHead>
                    <TableHead>{t("columns.endDate")}</TableHead>
                    <TableHead>{t("columns.status")}</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.map((c) => {
                    const status = resolveContractStatus(c);
                    return (
                      <TableRow key={c.id}>
                        {canWrite && (
                          <TableCell>
                            <Checkbox
                              checked={selected.has(c.id)}
                              onCheckedChange={(v) => toggleOne(c.id, Boolean(v))}
                            />
                          </TableCell>
                        )}
                        <TableCell className="font-mono text-xs">
                          {c.contract_number ?? "—"}
                        </TableCell>
                        <TableCell>{clientName(c)}</TableCell>
                        <TableCell className="max-w-[160px] truncate">{c.title}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatMoney(c.total_cents ?? c.amount_cents, "EUR", locale)}
                        </TableCell>
                        <TableCell className="text-xs">
                          {t(`frequency.${c.frequency as "monthly"}`)}
                        </TableCell>
                        <TableCell className="text-xs">{formatDate(c.start_date, locale)}</TableCell>
                        <TableCell className="text-xs">
                          {c.next_invoice_date
                            ? formatDate(c.next_invoice_date, locale)
                            : "—"}
                        </TableCell>
                        <TableCell className="text-xs">
                          {c.end_date ? formatDate(c.end_date, locale) : "—"}
                        </TableCell>
                        <TableCell>
                          <ContractStatusBadge status={status} />
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="size-7">
                                <MoreHorizontal className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() =>
                                  router.push(ROUTES.financeContract(slug, c.id))
                                }
                              >
                                <Eye className="size-3.5" />
                                {t("contracts.actions.view")}
                              </DropdownMenuItem>
                              {canWrite && (
                                <>
                                  <DropdownMenuItem
                                    onClick={() =>
                                      router.push(ROUTES.financeContractEdit(slug, c.id))
                                    }
                                  >
                                    <Pencil className="size-3.5" />
                                    {t("contracts.actions.edit")}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() =>
                                      runMutation(
                                        () => duplicateContractAction(slug, c.id),
                                        t("toast.saved"),
                                        (d) =>
                                          d?.id &&
                                          router.push(ROUTES.financeContract(slug, d.id)),
                                      )
                                    }
                                  >
                                    <Copy className="size-3.5" />
                                    {t("actions.duplicate")}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handlePdf(c)}>
                                    <FileDown className="size-3.5" />
                                    {t("actions.pdf")}
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  {status === "active" && (
                                    <>
                                      <DropdownMenuItem
                                        onClick={() =>
                                          runMutation(() =>
                                            updateContractStatusAction(slug, c.id, "renewing"),
                                          )
                                        }
                                      >
                                        <RefreshCw className="size-3.5" />
                                        {t("contracts.actions.renew")}
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() =>
                                          runMutation(() =>
                                            updateContractStatusAction(slug, c.id, "suspended"),
                                          )
                                        }
                                      >
                                        <Pause className="size-3.5" />
                                        {t("contracts.actions.suspend")}
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                  <DropdownMenuItem
                                    onClick={() =>
                                      runMutation(() =>
                                        updateContractStatusAction(slug, c.id, "cancelled"),
                                      )
                                    }
                                  >
                                    <X className="size-3.5" />
                                    {t("contracts.actions.cancel")}
                                  </DropdownMenuItem>
                                  {(status === "pending" || status === "cancelled") && (
                                    <DropdownMenuItem
                                      className="text-destructive"
                                      onClick={() =>
                                        runMutation(
                                          () => deleteContractAction(slug, c.id),
                                          t("toast.contractDeleted"),
                                        )
                                      }
                                    >
                                      <Trash2 className="size-3.5" />
                                      {t("contracts.actions.delete")}
                                    </DropdownMenuItem>
                                  )}
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

            <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
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
                  {t("form.prev")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  {t("form.next")}
                </Button>
              </div>
            </div>
          </>
        )}
      </OperationsWorkspace>
    </OperationsPage>
  );
}

