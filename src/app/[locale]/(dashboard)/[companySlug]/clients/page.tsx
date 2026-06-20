import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { requireCompanyContext } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { can } from "@/config/permissions";
import { AppShellPage } from "@/components/design-system/app-shell";
import { ClientsView } from "@/components/features/clients/clients-view";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("clients");
  return { title: t("title") };
}

interface PageProps {
  params: Promise<{ companySlug: string }>;
}

export default async function ClientsPage({ params }: PageProps) {
  const { companySlug } = await params;
  const ctx = await requireCompanyContext({ slug: companySlug, minRole: "supervisor" });

  const supabase = await createClient();
  const { data: clients } = await supabase
    .from("clients")
    .select(`*, addresses(id, street, house_number, city, postal_code, service_types, is_active)`)
    .eq("company_id", ctx.company.id)
    .neq("status", "archived")
    .order("name");

  return (
    <AppShellPage size="fluid" className="space-y-2">
      <ClientsView
        slug={companySlug}
        clients={clients ?? []}
        canWrite={can(ctx.membership.role, "clients:write")}
      />
    </AppShellPage>
  );
}
