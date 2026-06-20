import type { CreateQuoteInput } from "@/lib/validations/finance";
import type { QuoteListRow } from "./quotes-data";

export function quoteToFormInput(quote: QuoteListRow): CreateQuoteInput {
  return {
    clientId: quote.client_id,
    clientName: quote.client_name,
    clientCompany: quote.client_company ?? undefined,
    clientEmail: quote.client_email ?? "",
    clientPhone: quote.client_phone ?? undefined,
    clientAddress: quote.client_address ?? undefined,
    issueDate: quote.issue_date ?? undefined,
    validUntil: quote.valid_until,
    paymentTerms: quote.payment_terms ?? undefined,
    taxRate: Number(quote.tax_rate),
    discountCents: quote.discount_cents ?? 0,
    notes: quote.notes ?? undefined,
    internalNotes: quote.internal_notes ?? undefined,
    signatureText: quote.signature_text ?? undefined,
    assignedTo: quote.assigned_to,
    items: (quote.items ?? []).map((i) => ({
      description: i.description,
      quantity: Number(i.quantity),
      unitPriceCents: i.unit_price_cents,
      discountPercent: Number(i.discount_percent ?? 0),
    })),
  };
}
