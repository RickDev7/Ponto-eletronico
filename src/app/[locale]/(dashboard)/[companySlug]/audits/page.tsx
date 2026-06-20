import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { requireCompanyContext } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { buildAuditViolations } from "@/lib/audits/violations";
import { AppShellPage } from "@/components/design-system/layout/app-shell-content";
import { AuditsView } from "@/components/features/audits/audits-view";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("audits");
  return { title: t("title") };
}

interface PageProps {
  params: Promise<{ companySlug: string }>;
  searchParams: Promise<{ days?: string }>;
}

export default async function AuditsPage({ params, searchParams }: PageProps) {
  const [{ companySlug }, sp] = await Promise.all([params, searchParams]);
  const ctx = await requireCompanyContext({ slug: companySlug, minRole: "supervisor" });
  const supabase = await createClient();

  const days = [7, 14, 30].includes(Number(sp.days)) ? Number(sp.days) : 14;
  const from = new Date();
  from.setDate(from.getDate() - days);
  const fromIso = from.toISOString();

  const { data: checkIns } = await supabase
    .from("check_ins")
    .select(`
      id, check_in_at, check_out_at, check_in_latitude, check_in_longitude,
      employee:employees(full_name),
      task:tasks(
        id, title, scheduled_date,
        address:addresses(street, house_number, city, latitude, longitude)
      )
    `)
    .eq("company_id", ctx.company.id)
    .gte("check_in_at", fromIso)
    .order("check_in_at", { ascending: false })
    .limit(300);

  const rows = buildAuditViolations(checkIns ?? []);
  const violationCheckInIds = new Set(rows.map((r) => r.checkInId));
  const totalCheckIns = checkIns?.length ?? 0;
  const gpsMissingCount = rows.filter((r) => r.type === "gps_missing").length;
  const outsideRadiusCount = rows.filter((r) => r.type === "outside_radius").length;
  const passed = totalCheckIns - violationCheckInIds.size;

  const metrics = {
    pending: 0,
    passed,
    failed: outsideRadiusCount,
    inReview: gpsMissingCount,
  };

  return (
    <AppShellPage size="fluid">
      <AuditsView slug={companySlug} days={days} rows={rows} metrics={metrics} />
    </AppShellPage>
  );
}
