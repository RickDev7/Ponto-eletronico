import { requireCompanyContext } from "@/lib/auth/guards";
import { can } from "@/config/permissions";
import { WorkforceWorktimeView } from "@/components/features/workforce/workforce-worktime-view";
import { loadWorktimePolicy } from "@/lib/workforce/load-workforce-data";
import { AppShellPage } from "@/components/design-system/layout";

interface PageProps {
  params: Promise<{ companySlug: string }>;
}

export default async function WorkforceWorktimePage({ params }: PageProps) {
  const { companySlug } = await params;
  const ctx = await requireCompanyContext({ slug: companySlug, minRole: "supervisor" });
  const policy = await loadWorktimePolicy(ctx.company.id);

  return (
    <AppShellPage size="fluid">
      <WorkforceWorktimeView
        slug={companySlug}
        policy={policy}
        canWrite={can(ctx.membership.role, "employees:write")}
      />
    </AppShellPage>
  );
}
