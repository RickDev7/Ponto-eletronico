import { getLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { requireCompanyContext } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { can } from "@/config/permissions";
import { InvoiceDetailView } from "@/components/features/finance/invoice-detail-view";
import { AppShellPage } from "@/components/design-system/layout";

interface PageProps {
  params: Promise<{ companySlug: string; invoiceId: string }>;
}

export default async function InvoiceDetailPage({ params }: PageProps) {
  const { companySlug, invoiceId } = await params;
  const ctx = await requireCompanyContext({ slug: companySlug, minRole: "supervisor" });
  const supabase = await createClient();
  const locale = await getLocale();
  const dateLocale = locale === "en" ? "en-US" : "pt-BR";

  const [{ data: invoice }, { data: company }, { data: events }] = await Promise.all([
    supabase
      .from("invoices")
      .select("*, items:invoice_items(*), contract:contracts(title), payments:payments(method, payment_date, amount_cents)")
      .eq("id", invoiceId)
      .eq("company_id", ctx.company.id)
      .single(),
    supabase
      .from("companies")
      .select("name, legal_name, tax_id, email, phone, logo_url")
      .eq("id", ctx.company.id)
      .single(),
    supabase
      .from("invoice_events")
      .select("id, event_type, message, created_at, creator:profiles(full_name)")
      .eq("invoice_id", invoiceId)
      .eq("company_id", ctx.company.id)
      .order("created_at", { ascending: true }),
  ]);

  if (!invoice || !company) notFound();

  return (
    <AppShellPage size="fluid">
      <InvoiceDetailView
        slug={companySlug}
        invoice={invoice}
        events={events ?? []}
        company={company}
        locale={dateLocale}
        canWrite={can(ctx.membership.role, "finance:write")}
      />
    </AppShellPage>
  );
}
