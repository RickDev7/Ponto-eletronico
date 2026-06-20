import { requireCompanyContext } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { getMonthRange, monthKey } from "@/lib/finance/utils";
import type { ContractFrequency } from "@/lib/finance/utils";
import { monthlyAmountCents, type ContractListRow } from "@/lib/finance/contracts-data";
import { resolveDisplayStatus } from "@/lib/finance/invoices-data";
import { buildForecastFromData } from "@/lib/finance/forecast-data";

export interface FinanceDashboardKpis {
  monthlyRevenueCents: number;
  monthlyRevenueChangePct: number;
  projectedRevenueCents: number;
  receivedRevenueCents: number;
  pendingInvoicesCount: number;
  pendingInvoicesCents: number;
  overdueInvoicesCount: number;
  overdueInvoicesCents: number;
  openQuotesCount: number;
  openQuotesCents: number;
  conversionRate: number;
  mrrCents: number;
  arrCents: number;
  cashflowBalanceCents: number;
  sparklineRevenue: number[];
}

export interface FinanceChartPoint {
  key: string;
  label: string;
  revenue: number;
  expenses: number;
  profit: number;
}

export interface FinanceCashflowPoint {
  key: string;
  label: string;
  inflow: number;
  outflow: number;
  balance: number;
}

export interface FinanceRecentInvoice {
  id: string;
  invoice_number: string;
  client_name: string;
  issue_date: string;
  due_date: string;
  total_cents: number;
  status: string;
}

export interface FinanceContractRow {
  id: string;
  title: string;
  amount_cents: number;
  frequency: ContractFrequency;
  next_invoice_date: string | null;
  is_active: boolean;
  client_name: string;
}

export interface FinanceQuoteStats {
  sent: number;
  accepted: number;
  rejected: number;
  pending: number;
  conversionRate: number;
}

export interface FinanceForecast {
  days30Cents: number;
  days60Cents: number;
  days90Cents: number;
  annualCents: number;
  pipelinePotentialCents: number;
  pipelineClosedCents: number;
  contractRecurring30Cents: number;
  receivables30Cents: number;
}

export interface FinanceActivityItem {
  id: string;
  type: "payment" | "contract" | "quote" | "invoice" | "overdue";
  messageKey: string;
  messageParams: Record<string, string>;
  at: string;
}

export interface FinanceDashboardData {
  kpis: FinanceDashboardKpis;
  chartPoints: FinanceChartPoint[];
  cashflowPoints: FinanceCashflowPoint[];
  recentInvoices: FinanceRecentInvoice[];
  contracts: FinanceContractRow[];
  quoteStats: FinanceQuoteStats;
  forecast: FinanceForecast;
  activity: FinanceActivityItem[];
}


function shiftMonth(date: Date, delta: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}

function isOverdueInvoice(row: {
  status: string;
  due_date: string;
  total_cents: number;
  amount_paid_cents: number;
}): boolean {
  const display = resolveDisplayStatus(row.status, row.due_date);
  return display === "overdue";
}

function isOpenInvoice(row: {
  status: string;
  due_date: string;
}): boolean {
  const display = resolveDisplayStatus(row.status, row.due_date);
  return ["sent", "partial", "overdue"].includes(display);
}

export async function getFinanceDashboardData(
  slug: string,
): Promise<FinanceDashboardData> {
  const ctx = await requireCompanyContext({ slug, minRole: "supervisor" });
  const supabase = await createClient();
  const companyId = ctx.company.id;
  const now = new Date();

  const thisMonth = getMonthRange(monthKey(now));
  const prevMonth = getMonthRange(monthKey(shiftMonth(now, -1)));
  const twelveMonthsAgo = shiftMonth(now, -11);
  const rangeStart = getMonthRange(monthKey(twelveMonthsAgo)).start;

  const [
    { data: thisMonthPayments },
    { data: prevMonthPayments },
    { data: paymentsRange },
    { data: openInvoicesRaw },
    { data: openQuotes },
    { data: allQuotes },
    { data: activeContracts },
    { data: recentInvoices },
    { data: contractsList },
    { data: recentPayments },
    { data: recentContracts },
    { data: recentQuotes },
    { data: openLeads },
    { data: wonLeads },
    { data: invoicesWithTax },
  ] = await Promise.all([
    supabase
      .from("payments")
      .select("amount_cents")
      .eq("company_id", companyId)
      .gte("payment_date", thisMonth.start)
      .lte("payment_date", thisMonth.end),
    supabase
      .from("payments")
      .select("amount_cents")
      .eq("company_id", companyId)
      .gte("payment_date", prevMonth.start)
      .lte("payment_date", prevMonth.end),
    supabase
      .from("payments")
      .select("amount_cents, payment_date")
      .eq("company_id", companyId)
      .gte("payment_date", rangeStart),
    supabase
      .from("invoices")
      .select("total_cents, amount_paid_cents, status, due_date, invoice_number, client_name, issue_date")
      .eq("company_id", companyId)
      .in("status", ["sent", "partial", "overdue"]),
    supabase
      .from("quotes")
      .select("total_cents, status")
      .eq("company_id", companyId)
      .in("status", ["draft", "sent"]),
    supabase.from("quotes").select("status").eq("company_id", companyId),
    supabase
      .from("contracts")
      .select("id, title, amount_cents, total_cents, frequency, start_date, end_date, next_invoice_date, is_active, status, client:clients(name)")
      .eq("company_id", companyId),
    supabase
      .from("invoices")
      .select("id, invoice_number, client_name, issue_date, due_date, total_cents, status")
      .eq("company_id", companyId)
      .order("issue_date", { ascending: false })
      .limit(8),
    supabase
      .from("contracts")
      .select("id, title, amount_cents, frequency, next_invoice_date, is_active, client:clients(name)")
      .eq("company_id", companyId)
      .order("next_invoice_date", { ascending: true })
      .limit(6),
    supabase
      .from("payments")
      .select("id, amount_cents, payment_date, invoice:invoices(invoice_number)")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("contracts")
      .select("id, title, created_at, client:clients(name)")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(3),
    supabase
      .from("quotes")
      .select("id, quote_number, status, created_at, client_name")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(3),
    supabase
      .from("leads")
      .select("estimated_value_cents")
      .eq("company_id", companyId)
      .not("status", "in", '("won","lost")')
      .is("converted_client_id", null),
    supabase
      .from("leads")
      .select("estimated_value_cents")
      .eq("company_id", companyId)
      .eq("status", "won"),
    supabase
      .from("invoices")
      .select("tax_cents, issue_date")
      .eq("company_id", companyId)
      .gte("issue_date", rangeStart)
      .not("status", "in", '("cancelled","draft")'),
  ]);

  const monthlyRevenueCents =
    thisMonthPayments?.reduce((s, p) => s + (p.amount_cents ?? 0), 0) ?? 0;
  const prevRevenueCents =
    prevMonthPayments?.reduce((s, p) => s + (p.amount_cents ?? 0), 0) ?? 0;
  const monthlyRevenueChangePct =
    prevRevenueCents > 0
      ? Math.round(((monthlyRevenueCents - prevRevenueCents) / prevRevenueCents) * 100)
      : monthlyRevenueCents > 0
        ? 100
        : 0;

  const contractRows = (activeContracts ?? []) as ContractListRow[];
  const activeOnly = contractRows.filter((c) => c.is_active);

  const projectedRevenueCents = activeOnly.reduce(
    (s, c) => s + monthlyAmountCents(c),
    0,
  );

  const mrrCents = projectedRevenueCents;
  const arrCents = mrrCents * 12;

  const openInvoices = (openInvoicesRaw ?? []).filter((i) =>
    isOpenInvoice({ status: i.status, due_date: i.due_date ?? i.issue_date }),
  );
  const overdueInvoices = openInvoices.filter((i) =>
    isOverdueInvoice({
      status: i.status,
      due_date: i.due_date ?? i.issue_date,
      total_cents: i.total_cents ?? 0,
      amount_paid_cents: i.amount_paid_cents ?? 0,
    }),
  );
  const pendingOnly = openInvoices.filter((i) => !isOverdueInvoice({
    status: i.status,
    due_date: i.due_date ?? i.issue_date,
    total_cents: i.total_cents ?? 0,
    amount_paid_cents: i.amount_paid_cents ?? 0,
  }));

  const pendingInvoicesCents = pendingOnly.reduce(
    (s, i) => s + Math.max(0, (i.total_cents ?? 0) - (i.amount_paid_cents ?? 0)),
    0,
  );
  const overdueInvoicesCents = overdueInvoices.reduce(
    (s, i) => s + Math.max(0, (i.total_cents ?? 0) - (i.amount_paid_cents ?? 0)),
    0,
  );

  const accepted = allQuotes?.filter((q) => q.status === "accepted").length ?? 0;
  const rejected = allQuotes?.filter((q) => q.status === "rejected").length ?? 0;
  const sent = allQuotes?.filter((q) => q.status === "sent").length ?? 0;
  const pending = allQuotes?.filter((q) => q.status === "draft").length ?? 0;
  const conversionDenom = accepted + rejected;
  const conversionRate =
    conversionDenom > 0 ? Math.round((accepted / conversionDenom) * 100) : 0;

  const sparklineRevenue: number[] = [];
  const chartPoints: FinanceChartPoint[] = [];
  const cashflowPoints: FinanceCashflowPoint[] = [];
  let runningBalance = 0;

  for (let i = 11; i >= 0; i--) {
    const d = shiftMonth(now, -i);
    const key = monthKey(d);
    const { start, end } = getMonthRange(key);
    const label = d.toLocaleDateString("de-DE", { month: "short" });

    const monthPayments =
      paymentsRange?.filter((p) => p.payment_date >= start && p.payment_date <= end) ?? [];
    const revenue = monthPayments.reduce((s, p) => s + (p.amount_cents ?? 0), 0);

    const monthInvoices =
      invoicesWithTax?.filter((i) => i.issue_date >= start && i.issue_date <= end) ?? [];
    const expenses = monthInvoices.reduce((s, i) => s + (i.tax_cents ?? 0), 0);

    const profit = revenue - expenses;
    runningBalance += revenue - expenses;

    chartPoints.push({ key, label, revenue, expenses, profit });
    cashflowPoints.push({
      key,
      label,
      inflow: revenue,
      outflow: expenses,
      balance: runningBalance,
    });

    if (i <= 5) sparklineRevenue.push(revenue);
  }

  const pipelinePotentialCents =
    openLeads?.reduce((s, l) => s + (l.estimated_value_cents ?? 0), 0) ?? 0;
  const pipelineClosedCents =
    wonLeads?.reduce((s, l) => s + (l.estimated_value_cents ?? 0), 0) ?? 0;

  const forecastBuilt = buildForecastFromData(
    contractRows,
    (openInvoicesRaw ?? []).map((i) => ({
      due_date: i.due_date ?? i.issue_date,
      total_cents: i.total_cents ?? 0,
      amount_paid_cents: i.amount_paid_cents ?? 0,
      status: i.status,
    })),
    "de-DE",
  );

  const forecast: FinanceForecast = {
    days30Cents: forecastBuilt.days30Cents,
    days60Cents: forecastBuilt.days60Cents,
    days90Cents: forecastBuilt.days90Cents,
    annualCents: mrrCents * 12,
    pipelinePotentialCents,
    pipelineClosedCents,
    contractRecurring30Cents: forecastBuilt.contractRecurring30Cents,
    receivables30Cents: forecastBuilt.receivables30Cents,
  };

  const activity: FinanceActivityItem[] = [];

  for (const p of recentPayments ?? []) {
    const inv = Array.isArray(p.invoice) ? p.invoice[0] : p.invoice;
    activity.push({
      id: `pay-${p.id}`,
      type: "payment",
      messageKey: "activity.paymentReceived",
      messageParams: {
        number: (inv as { invoice_number?: string })?.invoice_number ?? "—",
      },
      at: p.payment_date,
    });
  }

  for (const c of recentContracts ?? []) {
    const client = Array.isArray(c.client) ? c.client[0] : c.client;
    activity.push({
      id: `con-${c.id}`,
      type: "contract",
      messageKey: "activity.contractCreated",
      messageParams: { client: (client as { name?: string })?.name ?? c.title },
      at: c.created_at,
    });
  }

  for (const q of recentQuotes ?? []) {
    if (q.status === "accepted") {
      activity.push({
        id: `quo-${q.id}`,
        type: "quote",
        messageKey: "activity.quoteAccepted",
        messageParams: { number: q.quote_number },
        at: q.created_at,
      });
    }
  }

  for (const inv of overdueInvoices ?? []) {
    activity.push({
      id: `ovd-${inv.invoice_number}`,
      type: "overdue",
      messageKey: "activity.clientOverdue",
      messageParams: { client: inv.client_name ?? "—" },
      at: inv.due_date ?? new Date().toISOString(),
    });
  }

  activity.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  const contracts: FinanceContractRow[] = (contractsList ?? []).map((c) => {
    const client = Array.isArray(c.client) ? c.client[0] : c.client;
    return {
      id: c.id,
      title: c.title,
      amount_cents: c.amount_cents,
      frequency: c.frequency as ContractFrequency,
      next_invoice_date: c.next_invoice_date,
      is_active: c.is_active,
      client_name: (client as { name?: string })?.name ?? "—",
    };
  });

  return {
    kpis: {
      monthlyRevenueCents,
      monthlyRevenueChangePct,
      projectedRevenueCents,
      receivedRevenueCents: monthlyRevenueCents,
      pendingInvoicesCount: pendingOnly.length,
      pendingInvoicesCents,
      overdueInvoicesCount: overdueInvoices.length,
      overdueInvoicesCents,
      openQuotesCount: openQuotes?.length ?? 0,
      openQuotesCents: openQuotes?.reduce((s, q) => s + (q.total_cents ?? 0), 0) ?? 0,
      conversionRate,
      mrrCents,
      arrCents,
      cashflowBalanceCents: runningBalance,
      sparklineRevenue,
    },
    chartPoints,
    cashflowPoints,
    recentInvoices: recentInvoices ?? [],
    contracts,
    quoteStats: { sent, accepted, rejected, pending, conversionRate },
    forecast,
    activity: activity.slice(0, 8),
  };
}
