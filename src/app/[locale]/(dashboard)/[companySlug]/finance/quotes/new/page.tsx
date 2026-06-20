import { getLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { requireCompanyContext } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { can } from "@/config/permissions";
import { QuoteFormView } from "@/components/features/finance/quote-form-view";
import { leadToQuotePrefill } from "@/lib/crm/leads-data";
import { loadOpenLeads, loadCrmMembers } from "@/lib/crm/load-crm-data";
import { AppShellPage } from "@/components/design-system/layout";

interface PageProps {
  params: Promise<{ companySlug: string }>;
  searchParams: Promise<{ leadId?: string }>;
}

async function loadFormData(companyId: string, leadId?: string) {
  const supabase = await createClient();
  const [{ data: company }, { data: clients }, members, leads] = await Promise.all([
    supabase
      .from("companies")
      .select("name, legal_name, tax_id, email, phone, logo_url")
      .eq("id", companyId)
      .single(),
    supabase
      .from("clients")
      .select("id, name, contact_name, email, phone")
      .eq("company_id", companyId)
      .eq("status", "active")
      .order("name"),
    loadCrmMembers(companyId),
    loadOpenLeads(companyId),
  ]);

  let initialValues;
  if (leadId) {
    const { data: lead } = await supabase
      .from("leads")
      .select("*, contacts:lead_contacts(*)")
      .eq("id", leadId)
      .eq("company_id", companyId)
      .single();
    if (lead) {
      initialValues = {
        ...leadToQuotePrefill(lead),
        items: [
          {
            description: `Serviço — ${lead.company_name}`,
            quantity: 1,
            unitPriceCents: lead.estimated_value_cents || 0,
            discountPercent: 0,
          },
        ],
        taxRate: 19,
        discountCents: 0,
      };
    }
  }

  return { company, clients: clients ?? [], members, leads, initialValues };
}

export default async function NewQuotePage({ params, searchParams }: PageProps) {
  const { companySlug } = await params;
  const { leadId } = await searchParams;
  const ctx = await requireCompanyContext({ slug: companySlug, minRole: "supervisor" });
  const locale = await getLocale();
  const dateLocale = locale === "en" ? "en-US" : "pt-BR";
  const { company, clients, members, leads, initialValues } = await loadFormData(
    ctx.company.id,
    leadId,
  );

  if (!company) notFound();

  return (
    <AppShellPage size="fluid">
      <QuoteFormView
        slug={companySlug}
        locale={dateLocale}
        company={company}
        clients={clients}
        leads={leads}
        members={members}
        initialValues={initialValues}
      />
    </AppShellPage>
  );
}
