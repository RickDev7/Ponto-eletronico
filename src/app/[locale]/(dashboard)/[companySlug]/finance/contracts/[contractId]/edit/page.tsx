import { getLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { requireCompanyContext } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { contractToFormInput } from "@/lib/finance/contracts-data";
import { ContractFormView } from "@/components/features/finance/contract-form-view";
import { AppShellPage } from "@/components/design-system/layout";

interface PageProps {
  params: Promise<{ companySlug: string; contractId: string }>;
}

async function loadFormData(companyId: string, contractId: string) {
  const supabase = await createClient();
  const [{ data: company }, { data: clients }, { data: memberRows }, { data: addresses }, { data: contract }] =
    await Promise.all([
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
      supabase
        .from("company_members")
        .select("user_id, profile:profiles(id, full_name)")
        .eq("company_id", companyId),
      supabase
        .from("addresses")
        .select("id, client_id, label, street, house_number, postal_code, city")
        .eq("company_id", companyId)
        .eq("is_active", true)
        .order("city"),
      supabase
        .from("contracts")
        .select("*, client:clients(name, contact_name, email, phone), items:contract_items(*)")
        .eq("id", contractId)
        .eq("company_id", companyId)
        .single(),
    ]);

  const members =
    memberRows?.map((m) => {
      const p = m.profile as
        | { id: string; full_name: string | null }
        | { id: string; full_name: string | null }[]
        | null;
      const profile = Array.isArray(p) ? p[0] : p;
      return { id: profile?.id ?? m.user_id, full_name: profile?.full_name ?? null };
    }) ?? [];

  return { company, clients: clients ?? [], members, addresses: addresses ?? [], contract };
}

export default async function EditContractPage({ params }: PageProps) {
  const { companySlug, contractId } = await params;
  const ctx = await requireCompanyContext({ slug: companySlug, minRole: "supervisor" });
  const locale = await getLocale();
  const dateLocale = locale === "en" ? "en-US" : "pt-BR";
  const { company, clients, members, addresses, contract } = await loadFormData(
    ctx.company.id,
    contractId,
  );

  if (!company || !contract) notFound();

  return (
    <AppShellPage size="fluid">
      <ContractFormView
        slug={companySlug}
        locale={dateLocale}
        company={company}
        clients={clients}
        addresses={addresses}
        members={members}
        contractId={contractId}
        initialValues={contractToFormInput(contract)}
      />
    </AppShellPage>
  );
}
