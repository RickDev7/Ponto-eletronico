import { requireCompanyContext } from "@/lib/auth/guards";
import { WorkforceDashboardView } from "@/components/features/workforce/workforce-dashboard-view";
import { loadWorkforceDashboardData } from "@/lib/workforce/load-workforce-data";
import { AppShellPage } from "@/components/design-system/layout";

interface PageProps {
  params: Promise<{ companySlug: string }>;
}

export default async function WorkforceDashboardPage({ params }: PageProps) {
  const { companySlug } = await params;
  const ctx = await requireCompanyContext({ slug: companySlug, minRole: "supervisor" });
  const data = await loadWorkforceDashboardData(ctx.company.id);

  return (
    <AppShellPage size="fluid">
      <WorkforceDashboardView
        slug={companySlug}
        employees={data.employees}
        vacations={data.vacations}
        absences={data.absences}
        todayMinutes={data.todayMinutes}
        overtimeMinutes={data.overtimeMinutes}
        weekShifts={data.shifts.length}
      />
    </AppShellPage>
  );
}
