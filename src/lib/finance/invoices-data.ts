import { getMonthRange, monthKey, type InvoiceStatus } from "@/lib/finance/utils";

export interface InvoiceListRow {
  id: string;
  invoice_number: string;
  client_id: string | null;
  contract_id: string | null;
  client_name: string;
  client_company: string | null;
  client_email: string | null;
  status: string;
  total_cents: number;
  amount_paid_cents: number;
  subtotal_cents: number;
  tax_cents: number;
  tax_rate: number;
  issue_date: string;
  due_date: string;
  period_start: string | null;
  period_end: string | null;
  notes: string | null;
  bank_details: string | null;
  auto_generated: boolean;
  kind?: string | null;
  created_at: string;
  updated_at: string;
  items?: Array<{
    description: string;
    quantity: number;
    unit_price_cents: number;
    line_total_cents: number;
  }>;
  contract?: { title: string } | { title: string }[] | null;
  payments?: Array<{
    method: string;
    payment_date: string;
    amount_cents: number;
  }>;
}

export interface InvoiceKpis {
  monthlyRevenueCents: number;
  monthlyRevenueTrend: number;
  issuedCount: number;
  pendingCount: number;
  pendingCents: number;
  paidCount: number;
  paidCents: number;
  overdueCount: number;
  overdueCents: number;
  projectedRevenueCents: number;
}

export interface MonthlyBucket {
  key: string;
  label: string;
  issuedCents: number;
  receivedCents: number;
  pendingCents: number;
  overdueCents: number;
}

export interface RecentPaymentRow {
  id: string;
  amount_cents: number;
  payment_date: string;
  method: string;
  invoice?: { invoice_number: string; client_name: string } | Array<{ invoice_number: string; client_name: string }> | null;
}

export function contractTitle(row: InvoiceListRow): string {
  const c = row.contract;
  if (!c) return "—";
  return Array.isArray(c) ? c[0]?.title ?? "—" : c.title;
}

export function lastPaymentMethod(row: InvoiceListRow): string | null {
  const payments = row.payments ?? [];
  if (payments.length === 0) return null;
  const sorted = [...payments].sort((a, b) => b.payment_date.localeCompare(a.payment_date));
  return sorted[0]?.method ?? null;
}

export function balanceCents(row: InvoiceListRow): number {
  return Math.max(0, row.total_cents - row.amount_paid_cents);
}

export function computeInvoiceKpis(
  monthInvoices: InvoiceListRow[],
  previousMonthRevenueCents: number,
  projectedRevenueCents: number,
): InvoiceKpis {
  const monthlyRevenueCents = monthInvoices
    .filter((i) => !["draft", "cancelled"].includes(i.status))
    .reduce((s, i) => s + i.total_cents, 0);

  const monthlyRevenueTrend =
    previousMonthRevenueCents > 0
      ? Math.round(((monthlyRevenueCents - previousMonthRevenueCents) / previousMonthRevenueCents) * 100)
      : monthlyRevenueCents > 0
        ? 100
        : 0;

  const pending = monthInvoices.filter((i) =>
    ["sent", "partial", "overdue"].includes(i.status),
  );
  const paid = monthInvoices.filter((i) => i.status === "paid");
  const overdue = monthInvoices.filter((i) => i.status === "overdue");

  return {
    monthlyRevenueCents,
    monthlyRevenueTrend,
    issuedCount: monthInvoices.filter((i) => i.status !== "draft").length,
    pendingCount: pending.length,
    pendingCents: pending.reduce((s, i) => s + balanceCents(i), 0),
    paidCount: paid.length,
    paidCents: paid.reduce((s, i) => s + i.total_cents, 0),
    overdueCount: overdue.length,
    overdueCents: overdue.reduce((s, i) => s + balanceCents(i), 0),
    projectedRevenueCents,
  };
}

export function computeMonthlyBuckets(
  invoices: InvoiceListRow[],
  year: number,
  locale: string,
): MonthlyBucket[] {
  return Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    const key = `${year}-${String(month).padStart(2, "0")}`;
    const { start, end } = getMonthRange(key);
    const monthInvoices = invoices.filter(
      (inv) => inv.issue_date >= start && inv.issue_date <= end,
    );

    const issuedCents = monthInvoices
      .filter((inv) => inv.status !== "draft" && inv.status !== "cancelled")
      .reduce((s, inv) => s + inv.total_cents, 0);

    const receivedCents = monthInvoices.reduce((s, inv) => s + inv.amount_paid_cents, 0);

    const pendingCents = monthInvoices
      .filter((inv) => ["sent", "partial"].includes(inv.status))
      .reduce((s, inv) => s + balanceCents(inv), 0);

    const overdueCents = monthInvoices
      .filter((inv) => inv.status === "overdue")
      .reduce((s, inv) => s + balanceCents(inv), 0);

    const label = new Date(year, i, 1).toLocaleDateString(locale, {
      month: "long",
      year: "numeric",
    });

    return { key, label, issuedCents, receivedCents, pendingCents, overdueCents };
  });
}

export function resolveDisplayStatus(status: string, dueDate: string): InvoiceStatus {
  if (status === "sent" || status === "partial") {
    const today = new Date().toISOString().slice(0, 10);
    if (dueDate < today) return "overdue";
  }
  return status as InvoiceStatus;
}

export function monthKeysAround(current: string, count = 12): string[] {
  const [y, m] = current.split("-").map(Number);
  const keys: string[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(y!, m! - 1 - i, 1);
    keys.unshift(monthKey(d));
  }
  return keys;
}
