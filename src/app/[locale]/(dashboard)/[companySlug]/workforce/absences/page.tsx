import { requireCompanyContext } from "@/lib/auth/guards";
import { can } from "@/config/permissions";
import { WorkforceAbsencesView } from "@/components/features/workforce/workforce-absences-view";
import { loadAbsences, loadWorkforceEmployees } from "@/lib/workforce/load-workforce-data";
import { AppShellPage } from "@/components/design-system/layout";

interface PageProps {
  params: Promise<{ companySlug: string }>;
}

export default async function WorkforceAbsencesPage({ params }: PageProps) {
  const { companySlug } = await params;
  const ctx = await requireCompanyContext({ slug: companySlug, minRole: "supervisor" });
  const [absences, employees] = await Promise.all([
    loadAbsences(ctx.company.id),
    loadWorkforceEmployees(ctx.company.id),
  ]);

  return (
    <AppShellPage size="fluid">
      <WorkforceAbsencesView
        slug={companySlug}
        absences={absences}
        employees={employees.map((e) => ({ id: e.id, full_name: e.full_name }))}
        canWrite={can(ctx.membership.role, "employees:write")}
      />
    </AppShellPage>
  );
}
