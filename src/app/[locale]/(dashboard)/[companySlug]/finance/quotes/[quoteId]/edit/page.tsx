import { getLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { requireCompanyContext } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { QuoteFormView } from "@/components/features/finance/quote-form-view";
import { quoteToFormInput } from "@/lib/finance/quote-form-mapper";
import { AppShellPage } from "@/components/design-system/layout";

interface PageProps {
  params: Promise<{ companySlug: string; quoteId: string }>;
}

export default async function EditQuotePage({ params }: PageProps) {
  const { companySlug, quoteId } = await params;
  const ctx = await requireCompanyContext({ slug: companySlug, minRole: "supervisor" });
  const supabase = await createClient();
  const locale = await getLocale();
  const dateLocale = locale === "en" ? "en-US" : "pt-BR";

  const [{ data: quote }, { data: company }, { data: clients }, { data: memberRows }] =
    await Promise.all([
      supabase
        .from("quotes")
        .select("*, items:quote_items(*)")
        .eq("id", quoteId)
        .eq("company_id", ctx.company.id)
        .single(),
      supabase
        .from("companies")
        .select("name, legal_name, tax_id, email, phone, logo_url")
        .eq("id", ctx.company.id)
        .single(),
      supabase
        .from("clients")
        .select("id, name, contact_name, email, phone")
        .eq("company_id", ctx.company.id)
        .eq("status", "active")
        .order("name"),
      supabase
        .from("company_members")
        .select("user_id, profile:profiles(id, full_name)")
        .eq("company_id", ctx.company.id),
    ]);

  if (!quote || !company) notFound();

  const members =
    memberRows?.map((m) => {
      const p = m.profile as { id: string; full_name: string | null } | { id: string; full_name: string | null }[] | null;
      const profile = Array.isArray(p) ? p[0] : p;
      return { id: profile?.id ?? m.user_id, full_name: profile?.full_name ?? null };
    }) ?? [];

  return (
    <AppShellPage size="fluid">
      <QuoteFormView
        slug={companySlug}
        locale={dateLocale}
        company={company}
        clients={clients ?? []}
        members={members}
        quoteId={quoteId}
        initialValues={quoteToFormInput(quote)}
      />
    </AppShellPage>
  );
}
