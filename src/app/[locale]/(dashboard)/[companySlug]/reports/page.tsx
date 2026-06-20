import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { requireCompanyContext } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { AppShellPage } from "@/components/design-system/layout/app-shell-content";
import { ReportsView } from "@/components/features/reports/reports-view";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("reports");
  return { title: t("title") };
}

interface PageProps {
  params: Promise<{ companySlug: string }>;
}

export default async function ReportsPage({ params }: PageProps) {
  const { companySlug } = await params;
  const ctx = await requireCompanyContext({ slug: companySlug, minRole: "supervisor" });

  const supabase = await createClient();

  const { data: reports } = await supabase
    .from("reports")
    .select(`*, generator:profiles(full_name)`)
    .eq("company_id", ctx.company.id)
    .order("created_at", { ascending: false });

  return (
    <AppShellPage size="fluid">
      <ReportsView
        slug={companySlug}
        reports={reports ?? []}
        companyName={ctx.company.name}
      />
    </AppShellPage>
  );
}
