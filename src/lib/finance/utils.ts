export type QuoteStatus =
  | "draft"
  | "sent"
  | "under_review"
  | "accepted"
  | "rejected"
  | "expired";
export type InvoiceStatus =
  | "draft"
  | "sent"
  | "paid"
  | "partial"
  | "overdue"
  | "cancelled";
export type ContractFrequency =
  | "monthly"
  | "bimonthly"
  | "quarterly"
  | "semiannual"
  | "annual";

export type ContractStatus =
  | "active"
  | "pending"
  | "suspended"
  | "expired"
  | "cancelled"
  | "renewing";
export type PaymentMethod = "bank_transfer" | "cash" | "card" | "other";

export interface FinanceLineItem {
  description: string;
  quantity: number;
  unitPriceCents: number;
  discountPercent?: number;
  lineTotalCents: number;
}

export interface FinanceTotals {
  subtotalCents: number;
  discountCents: number;
  taxRate: number;
  taxCents: number;
  totalCents: number;
}

export function calculateLineTotal(
  quantity: number,
  unitPriceCents: number,
  discountPercent = 0,
): number {
  const gross = quantity * unitPriceCents;
  return Math.round(gross * (1 - discountPercent / 100));
}

export function calculateTotals(
  items: Pick<FinanceLineItem, "lineTotalCents">[],
  taxRate: number,
  discountCents = 0,
): FinanceTotals {
  const subtotalCents = items.reduce((sum, item) => sum + item.lineTotalCents, 0);
  const taxable = Math.max(0, subtotalCents - discountCents);
  const taxCents = Math.round(taxable * (taxRate / 100));
  return {
    subtotalCents,
    discountCents,
    taxRate,
    taxCents,
    totalCents: taxable + taxCents,
  };
}

export function resolveQuoteDisplayStatus(
  status: string,
  validUntil: string | null,
): QuoteStatus {
  if (
    validUntil &&
    status !== "accepted" &&
    status !== "rejected" &&
    status !== "draft" &&
    new Date(validUntil) < new Date(new Date().toISOString().slice(0, 10))
  ) {
    return "expired";
  }
  return status as QuoteStatus;
}

export function quoteConversionRate(
  accepted: number,
  rejected: number,
): number {
  const decided = accepted + rejected;
  if (decided === 0) return 0;
  return Math.round((accepted / decided) * 100);
}

export function advanceDateByFrequency(
  date: Date,
  frequency: ContractFrequency,
): Date {
  const next = new Date(date);
  switch (frequency) {
    case "monthly":
      next.setMonth(next.getMonth() + 1);
      break;
    case "bimonthly":
      next.setMonth(next.getMonth() + 2);
      break;
    case "quarterly":
      next.setMonth(next.getMonth() + 3);
      break;
    case "semiannual":
      next.setMonth(next.getMonth() + 6);
      break;
    case "annual":
      next.setFullYear(next.getFullYear() + 1);
      break;
  }
  return next;
}

export function formatMoney(
  cents: number,
  currency = "EUR",
  locale = "de-DE",
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

export function formatDate(date: string | Date, locale = "de-DE"): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function parseMonthKey(key: string): { year: number; month: number } {
  const [year, month] = key.split("-").map(Number);
  return { year: year!, month: month! };
}

export function getMonthRange(key: string): { start: string; end: string } {
  const { year, month } = parseMonthKey(key);
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}
