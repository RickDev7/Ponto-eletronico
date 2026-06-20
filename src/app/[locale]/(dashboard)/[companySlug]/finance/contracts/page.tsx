import { getLocale } from "next-intl/server";
import { requireCompanyContext } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { can } from "@/config/permissions";
import { ContractsView } from "@/components/features/finance/contracts-view";
import { AppShellPage } from "@/components/design-system/layout";

interface PageProps {
  params: Promise<{ companySlug: string }>;
}

export default async function FinanceContractsPage({ params }: PageProps) {
  const { companySlug } = await params;
  const ctx = await requireCompanyContext({ slug: companySlug, minRole: "supervisor" });
  const supabase = await createClient();
  const locale = await getLocale();
  const dateLocale = locale === "en" ? "en-US" : "pt-BR";

  const [{ data: contracts }, { data: company }, { data: memberRows }] = await Promise.all([
    supabase
      .from("contracts")
      .select("*, client:clients(name, contact_name, email), items:contract_items(*)")
      .eq("company_id", ctx.company.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("companies")
      .select("name, legal_name, tax_id, email, phone, logo_url")
      .eq("id", ctx.company.id)
      .single(),
    supabase
      .from("company_members")
      .select("user_id, profile:profiles(id, full_name)")
      .eq("company_id", ctx.company.id),
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

  return (
    <AppShellPage size="fluid">
      <ContractsView
        slug={companySlug}
        contracts={contracts ?? []}
        company={company ?? { name: "", legal_name: null, tax_id: null, email: null, phone: null, logo_url: null }}
        members={members}
        locale={dateLocale}
        canWrite={can(ctx.membership.role, "finance:write")}
      />
    </AppShellPage>
  );
}
