import { requireCompanyContext } from "@/lib/auth/guards";
import { can } from "@/config/permissions";
import { OperationsTeamsView } from "@/components/features/operations/operations-teams-view";
import { loadEmployeesForOperations, loadTeams } from "@/lib/operations/load-operations-data";
import { AppShellPage } from "@/components/design-system/layout";

interface PageProps {
  params: Promise<{ companySlug: string }>;
}

export default async function WorkforceTeamsPage({ params }: PageProps) {
  const { companySlug } = await params;
  const ctx = await requireCompanyContext({ slug: companySlug, minRole: "supervisor" });

  const [teams, employees] = await Promise.all([
    loadTeams(ctx.company.id),
    loadEmployeesForOperations(ctx.company.id),
  ]);

  return (
    <AppShellPage size="fluid">
      <OperationsTeamsView
        slug={companySlug}
        teams={teams}
        employees={employees}
        canWrite={can(ctx.membership.role, "employees:write")}
      />
    </AppShellPage>
  );
}
