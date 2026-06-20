import { getLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { requireCompanyContext } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { can } from "@/config/permissions";
import { QuoteDetailView } from "@/components/features/finance/quote-detail-view";
import { AppShellPage } from "@/components/design-system/layout";

interface PageProps {
  params: Promise<{ companySlug: string; quoteId: string }>;
}

export default async function QuoteDetailPage({ params }: PageProps) {
  const { companySlug, quoteId } = await params;
  const ctx = await requireCompanyContext({ slug: companySlug, minRole: "supervisor" });
  const supabase = await createClient();
  const locale = await getLocale();
  const dateLocale = locale === "en" ? "en-US" : "pt-BR";

  const [{ data: quote }, { data: company }, { data: events }] = await Promise.all([
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
      .from("quote_events")
      .select("id, event_type, message, created_at, creator:profiles(full_name)")
      .eq("quote_id", quoteId)
      .eq("company_id", ctx.company.id)
      .order("created_at", { ascending: true }),
  ]);

  if (!quote || !company) notFound();

  return (
    <AppShellPage size="fluid">
      <QuoteDetailView
        slug={companySlug}
        quote={quote}
        events={events ?? []}
        company={company}
        locale={dateLocale}
        canWrite={can(ctx.membership.role, "finance:write")}
      />
    </AppShellPage>
  );
}
