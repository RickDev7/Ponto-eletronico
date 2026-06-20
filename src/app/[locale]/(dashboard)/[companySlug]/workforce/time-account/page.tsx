import { requireCompanyContext } from "@/lib/auth/guards";
import { WorkforceTimeAccountView } from "@/components/features/workforce/workforce-time-account-view";
import { loadTimeAccountSummaries } from "@/lib/workforce/load-workforce-data";
import { AppShellPage } from "@/components/design-system/layout";

interface PageProps {
  params: Promise<{ companySlug: string }>;
}

export default async function WorkforceTimeAccountPage({ params }: PageProps) {
  const { companySlug } = await params;
  const ctx = await requireCompanyContext({ slug: companySlug, minRole: "supervisor" });
  const summaries = await loadTimeAccountSummaries(ctx.company.id);

  return (
    <AppShellPage size="fluid">
      <WorkforceTimeAccountView slug={companySlug} summaries={summaries} />
    </AppShellPage>
  );
}
