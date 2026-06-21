import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildFinancePdfHtml } from "@/lib/finance/pdf";
import { invoiceToPdfDocument } from "@/lib/finance/invoicing-engine";

interface RouteParams {
  params: Promise<{ invoiceId: string }>;
}

const PDF_LABELS = {
  quoteTitle: "Quote",
  invoiceTitle: "Invoice",
  from: "From",
  to: "To",
  date: "Date",
  dueDate: "Due date",
  validUntil: "Valid until",
  description: "Description",
  quantity: "Qty",
  unitPrice: "Unit price",
  total: "Total",
  subtotal: "Subtotal",
  tax: "VAT",
  grandTotal: "Total",
  notes: "Notes",
  bankDetails: "Bank details",
};

export async function GET(_request: Request, { params }: RouteParams) {
  const { invoiceId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: invoice } = await supabase
    .from("invoices")
    .select("*, items:invoice_items(*)")
    .eq("id", invoiceId)
    .single();

  if (!invoice) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: company } = await supabase
    .from("companies")
    .select("name, legal_name, tax_id, email, phone, logo_url")
    .eq("id", invoice.company_id)
    .single();

  if (!company) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const html = buildFinancePdfHtml(
    invoiceToPdfDocument(
      invoice,
      {
        name: company.name,
        legalName: company.legal_name,
        taxId: company.tax_id,
        email: company.email,
        phone: company.phone,
        logoUrl: company.logo_url,
      },
      "de-DE",
      PDF_LABELS,
    ),
  );

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `inline; filename="${invoice.invoice_number}.html"`,
    },
  });
}
