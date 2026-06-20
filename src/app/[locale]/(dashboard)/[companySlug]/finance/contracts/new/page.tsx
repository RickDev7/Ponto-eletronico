import { getLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { requireCompanyContext } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { ContractFormView } from "@/components/features/finance/contract-form-view";
import { AppShellPage } from "@/components/design-system/layout";

interface PageProps {
  params: Promise<{ companySlug: string }>;
  searchParams: Promise<{ clientId?: string }>;
}

async function loadFormData(companyId: string) {
  const supabase = await createClient();
  const [{ data: company }, { data: clients }, { data: memberRows }, { data: addresses }] =
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

  return { company, clients: clients ?? [], members, addresses: addresses ?? [] };
}

export default async function NewContractPage({ params, searchParams }: PageProps) {
  const { companySlug } = await params;
  const { clientId } = await searchParams;
  const ctx = await requireCompanyContext({ slug: companySlug, minRole: "supervisor" });
  const locale = await getLocale();
  const dateLocale = locale === "en" ? "en-US" : "pt-BR";
  const { company, clients, members, addresses } = await loadFormData(ctx.company.id);

  if (!company) notFound();

  const selectedClient = clientId ? clients.find((c) => c.id === clientId) : clients[0];
  const defaultAddress = selectedClient
    ? addresses.find((a) => a.client_id === selectedClient.id)
    : undefined;

  return (
    <AppShellPage size="fluid">
      <ContractFormView
        slug={companySlug}
        locale={dateLocale}
        company={company}
        clients={clients}
        addresses={addresses}
        members={members}
        initialValues={
          selectedClient
            ? {
                clientId: selectedClient.id,
                addressId: defaultAddress?.id ?? null,
                clientName: selectedClient.name,
                clientCompany: selectedClient.contact_name ?? "",
                clientEmail: selectedClient.email ?? "",
                clientPhone: selectedClient.phone ?? "",
                clientAddress: defaultAddress
                  ? `${defaultAddress.street}${defaultAddress.house_number ? ` ${defaultAddress.house_number}` : ""}, ${defaultAddress.postal_code} ${defaultAddress.city}`
                  : "",
                title: `Contrato — ${selectedClient.name}`,
                items: [{ description: "", quantity: 1, unitPriceCents: 0 }],
                frequency: "monthly",
                startDate: new Date().toISOString().slice(0, 10),
                endDate: "",
                taxRate: 19,
                discountCents: 0,
                notes: "",
                autoRenew: true,
                renewalNoticeDays: 30,
                autoGenerateInvoice: true,
                autoSendEmail: false,
                autoGeneratePdf: true,
                paymentReminder: true,
                assignedTo: members[0]?.id ?? null,
                isActive: true,
              }
            : undefined
        }
      />
    </AppShellPage>
  );
}
