import {
  quoteConversionRate,
  resolveQuoteDisplayStatus,
  type QuoteStatus,
} from "@/lib/finance/utils";

export interface QuoteListRow {
  id: string;
  quote_number: string;
  client_id: string | null;
  client_name: string;
  client_company: string | null;
  status: string;
  total_cents: number;
  issue_date: string | null;
  valid_until: string | null;
  created_at: string;
  updated_at: string;
  assigned_to: string | null;
  subtotal_cents: number;
  tax_cents: number;
  tax_rate: number;
  discount_cents: number;
  notes: string | null;
  signature_text: string | null;
  client_email: string | null;
  client_phone: string | null;
  client_address: string | null;
  payment_terms: string | null;
  internal_notes: string | null;
  created_by: string | null;
  items?: Array<{
    description: string;
    quantity: number;
    unit_price_cents: number;
    discount_percent?: number;
    line_total_cents: number;
  }>;
  assignee?: { full_name: string | null } | { full_name: string | null }[] | null;
  creator?: { full_name: string | null } | { full_name: string | null }[] | null;
}

export interface QuotesKpis {
  total: number;
  underReview: number;
  accepted: number;
  rejected: number;
  potentialValueCents: number;
  conversionRate: number;
}

export function computeQuotesKpis(quotes: QuoteListRow[]): QuotesKpis {
  const underReview = quotes.filter((q) => {
    const d = resolveQuoteDisplayStatus(q.status, q.valid_until);
    return d === "sent" || d === "under_review";
  }).length;

  const accepted = quotes.filter((q) => q.status === "accepted").length;
  const rejected = quotes.filter((q) => q.status === "rejected").length;
  const potentialValueCents = quotes
    .filter((q) => !["accepted", "rejected"].includes(q.status))
    .reduce((s, q) => s + q.total_cents, 0);

  return {
    total: quotes.length,
    underReview,
    accepted,
    rejected,
    potentialValueCents,
    conversionRate: quoteConversionRate(accepted, rejected),
  };
}

export function assigneeName(
  row: Pick<QuoteListRow, "assignee" | "creator">,
): string {
  const a = row.assignee;
  if (a) {
    const name = Array.isArray(a) ? a[0]?.full_name : a.full_name;
    if (name) return name;
  }
  const c = row.creator;
  if (!c) return "—";
  return Array.isArray(c) ? c[0]?.full_name ?? "—" : c.full_name ?? "—";
}

export function displayStatus(row: QuoteListRow): QuoteStatus {
  return resolveQuoteDisplayStatus(row.status, row.valid_until);
}
