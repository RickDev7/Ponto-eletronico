import { getLocale } from "next-intl/server";
import { requireCompanyContext } from "@/lib/auth/guards";
import { OperationsDashboardView } from "@/components/features/operations/operations-dashboard-view";
import {
  loadExecutions,
  loadProperties,
  loadTeams,
} from "@/lib/operations/load-operations-data";
import { AppShellPage } from "@/components/design-system/layout";

interface PageProps {
  params: Promise<{ companySlug: string }>;
}

export default async function OperationsDashboardPage({ params }: PageProps) {
  const { companySlug } = await params;
  const ctx = await requireCompanyContext({ slug: companySlug, minRole: "supervisor" });

  const [executions, properties, teams] = await Promise.all([
    loadExecutions(ctx.company.id),
    loadProperties(ctx.company.id),
    loadTeams(ctx.company.id),
  ]);

  await getLocale();

  return (
    <AppShellPage size="fluid">
      <OperationsDashboardView
        slug={companySlug}
        executions={executions}
        properties={properties}
        teams={teams}
      />
    </AppShellPage>
  );
}
