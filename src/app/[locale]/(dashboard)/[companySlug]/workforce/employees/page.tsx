import { requireCompanyContext } from "@/lib/auth/guards";
import { can } from "@/config/permissions";
import { WorkforceEmployeesView } from "@/components/features/workforce/workforce-employees-view";
import { loadWorkforceEmployeesHub } from "@/lib/workforce/load-workforce-data";
import { AppShellPage } from "@/components/design-system/layout";

interface PageProps {
  params: Promise<{ companySlug: string }>;
}

export default async function WorkforceEmployeesPage({ params }: PageProps) {
  const { companySlug } = await params;
  const ctx = await requireCompanyContext({ slug: companySlug, minRole: "supervisor" });
  const hub = await loadWorkforceEmployeesHub(ctx.company.id);

  return (
    <AppShellPage size="fluid">
      <WorkforceEmployeesView
        slug={companySlug}
        employees={hub.employees}
        teams={hub.teams}
        skills={hub.skills.map((s) => ({ id: s.id, name: s.name }))}
        supervisors={hub.supervisors}
        canWrite={can(ctx.membership.role, "employees:write")}
        canDelete={can(ctx.membership.role, "employees:delete")}
      />
    </AppShellPage>
  );
}
