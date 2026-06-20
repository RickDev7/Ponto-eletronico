import { requireCompanyContext } from "@/lib/auth/guards";
import { WorkforceEmployeesView } from "@/components/features/workforce/workforce-employees-view";
import { loadWorkforceEmployees } from "@/lib/workforce/load-workforce-data";
import { AppShellPage } from "@/components/design-system/layout";

interface PageProps {
  params: Promise<{ companySlug: string }>;
}

export default async function WorkforceEmployeesPage({ params }: PageProps) {
  const { companySlug } = await params;
  const ctx = await requireCompanyContext({ slug: companySlug, minRole: "supervisor" });
  const employees = await loadWorkforceEmployees(ctx.company.id);

  return (
    <AppShellPage size="fluid">
      <WorkforceEmployeesView slug={companySlug} employees={employees} />
    </AppShellPage>
  );
}
