import { requireCompanyContext } from "@/lib/auth/guards";
import { can } from "@/config/permissions";
import { loadAutomationsPageData } from "@/lib/automations/load-automations-data";
import { AutomationsView } from "@/components/features/automations/automations-view";
import { AppShellPage } from "@/components/design-system/layout";

interface PageProps {
  params: Promise<{ companySlug: string }>;
}

export default async function AutomationsPage({ params }: PageProps) {
  const { companySlug } = await params;
  const ctx = await requireCompanyContext({ slug: companySlug, minRole: "supervisor" });
  const data = await loadAutomationsPageData(ctx.company.id);

  return (
    <AppShellPage size="fluid">
      <AutomationsView
        slug={companySlug}
        data={data}
        canWrite={can(ctx.membership.role, "automations:write")}
      />
    </AppShellPage>
  );
}
