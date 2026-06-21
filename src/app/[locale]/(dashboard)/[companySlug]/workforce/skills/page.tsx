import { requireCompanyContext } from "@/lib/auth/guards";
import { can } from "@/config/permissions";
import { WorkforceSkillsView } from "@/components/features/workforce/workforce-skills-view";
import {
  loadCompanySkills,
  loadEmployeeSkillsForCompany,
  loadWorkforceEmployees,
} from "@/lib/workforce/load-workforce-data";
import { AppShellPage } from "@/components/design-system/layout";

interface PageProps {
  params: Promise<{ companySlug: string }>;
}

export default async function WorkforceSkillsPage({ params }: PageProps) {
  const { companySlug } = await params;
  const ctx = await requireCompanyContext({ slug: companySlug, minRole: "supervisor" });

  const [skills, employeeSkills, employees] = await Promise.all([
    loadCompanySkills(ctx.company.id),
    loadEmployeeSkillsForCompany(ctx.company.id),
    loadWorkforceEmployees(ctx.company.id),
  ]);

  return (
    <AppShellPage size="fluid">
      <WorkforceSkillsView
        slug={companySlug}
        skills={skills}
        employeeSkills={employeeSkills}
        employees={employees}
        canWrite={can(ctx.membership.role, "employees:write")}
      />
    </AppShellPage>
  );
}
