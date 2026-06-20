import { requireCompanyContext } from "@/lib/auth/guards";
import { can } from "@/config/permissions";
import { WorkforceVacationsView } from "@/components/features/workforce/workforce-vacations-view";
import { loadVacationRequests, loadWorkforceEmployees } from "@/lib/workforce/load-workforce-data";
import { AppShellPage } from "@/components/design-system/layout";

interface PageProps {
  params: Promise<{ companySlug: string }>;
}

export default async function WorkforceVacationsPage({ params }: PageProps) {
  const { companySlug } = await params;
  const ctx = await requireCompanyContext({ slug: companySlug, minRole: "supervisor" });
  const [requests, employees] = await Promise.all([
    loadVacationRequests(ctx.company.id),
    loadWorkforceEmployees(ctx.company.id),
  ]);

  return (
    <AppShellPage size="fluid">
      <WorkforceVacationsView
        slug={companySlug}
        requests={requests}
        employees={employees.map((e) => ({ id: e.id, full_name: e.full_name }))}
        canWrite={can(ctx.membership.role, "employees:write")}
      />
    </AppShellPage>
  );
}
