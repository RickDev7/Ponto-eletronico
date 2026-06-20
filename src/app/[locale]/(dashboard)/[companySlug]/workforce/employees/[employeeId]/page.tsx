import { getLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { requireCompanyContext } from "@/lib/auth/guards";
import { can } from "@/config/permissions";
import { EmployeeProfileView } from "@/components/features/workforce/employee-profile-view";
import { loadEmployeeProfile, loadWorkforceEmployees } from "@/lib/workforce/load-workforce-data";
import { AppShellPage } from "@/components/design-system/layout";

interface PageProps {
  params: Promise<{ companySlug: string; employeeId: string }>;
}

export default async function WorkforceEmployeeProfilePage({ params }: PageProps) {
  const { companySlug, employeeId } = await params;
  const ctx = await requireCompanyContext({ slug: companySlug, minRole: "supervisor" });
  const locale = await getLocale();
  const dateLocale = locale === "en" ? "en-US" : "pt-BR";

  const [profile, allEmployees] = await Promise.all([
    loadEmployeeProfile(ctx.company.id, employeeId),
    loadWorkforceEmployees(ctx.company.id),
  ]);
  if (!profile.employee) notFound();

  const supervisors = allEmployees
    .filter((e) => e.id !== employeeId)
    .map((e) => ({ id: e.id, full_name: e.full_name }));

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = profile.upcomingShifts.filter((s) => {
    const task = Array.isArray(s.task) ? s.task[0] : s.task;
    return task && task.scheduled_date >= today;
  });

  return (
    <AppShellPage size="fluid">
      <EmployeeProfileView
        slug={companySlug}
        employeeId={employeeId}
        employee={profile.employee}
        supervisors={supervisors}
        vacations={profile.vacations}
        absences={profile.absences}
        timeEntries={profile.timeEntries}
        documents={profile.documents}
        upcomingShifts={upcoming}
        locale={dateLocale}
        canWrite={can(ctx.membership.role, "employees:write")}
      />
    </AppShellPage>
  );
}
