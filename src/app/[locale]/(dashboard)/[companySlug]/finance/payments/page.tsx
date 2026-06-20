import { getLocale } from "next-intl/server";
import { requireCompanyContext } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { can } from "@/config/permissions";
import { PaymentsView } from "@/components/features/finance/payments-view";
import { AppShellPage } from "@/components/design-system/layout";

interface PageProps {
  params: Promise<{ companySlug: string }>;
}

export default async function FinancePaymentsPage({ params }: PageProps) {
  const { companySlug } = await params;
  const ctx = await requireCompanyContext({ slug: companySlug, minRole: "supervisor" });
  const supabase = await createClient();
  const locale = await getLocale();
  const dateLocale = locale === "en" ? "en-US" : "pt-BR";

  const [{ data: payments }, { data: openInvoices }] = await Promise.all([
    supabase
      .from("payments")
      .select("*, invoice:invoices(invoice_number, client_name)")
      .eq("company_id", ctx.company.id)
      .order("payment_date", { ascending: false })
      .limit(100),
    supabase
      .from("invoices")
      .select("id, invoice_number, client_name, total_cents, amount_paid_cents")
      .eq("company_id", ctx.company.id)
      .in("status", ["sent", "partial", "overdue"]),
  ]);

  return (
    <AppShellPage size="fluid">
      <PaymentsView
        slug={companySlug}
        payments={payments ?? []}
        openInvoices={openInvoices ?? []}
        locale={dateLocale}
        canWrite={can(ctx.membership.role, "finance:write")}
      />
    </AppShellPage>
  );
}
