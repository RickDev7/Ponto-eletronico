import { getLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { requireCompanyContext } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { can } from "@/config/permissions";
import { ContractDetailView } from "@/components/features/finance/contract-detail-view";
import { AppShellPage } from "@/components/design-system/layout";

interface PageProps {
  params: Promise<{ companySlug: string; contractId: string }>;
}

export default async function ContractDetailPage({ params }: PageProps) {
  const { companySlug, contractId } = await params;
  const ctx = await requireCompanyContext({ slug: companySlug, minRole: "supervisor" });
  const supabase = await createClient();
  const locale = await getLocale();
  const dateLocale = locale === "en" ? "en-US" : "pt-BR";

  const [{ data: contract }, { data: company }, { data: events }, { data: invoices }] =
    await Promise.all([
      supabase
        .from("contracts")
        .select("*, client:clients(name, contact_name, email, phone), items:contract_items(*)")
        .eq("id", contractId)
        .eq("company_id", ctx.company.id)
        .single(),
      supabase
        .from("companies")
        .select("name, legal_name, tax_id, email, phone, logo_url")
        .eq("id", ctx.company.id)
        .single(),
      supabase
        .from("contract_events")
        .select("id, event_type, message, created_at, creator:profiles(full_name)")
        .eq("contract_id", contractId)
        .eq("company_id", ctx.company.id)
        .order("created_at", { ascending: true }),
      supabase
        .from("invoices")
        .select("id, invoice_number, issue_date, due_date, total_cents, status, amount_paid_cents")
        .eq("contract_id", contractId)
        .eq("company_id", ctx.company.id)
        .order("issue_date", { ascending: false }),
    ]);

  if (!contract || !company) notFound();

  return (
    <AppShellPage size="fluid">
      <ContractDetailView
        slug={companySlug}
        contract={contract}
        events={events ?? []}
        invoices={invoices ?? []}
        company={company}
        locale={dateLocale}
        canWrite={can(ctx.membership.role, "finance:write")}
      />
    </AppShellPage>
  );
}
