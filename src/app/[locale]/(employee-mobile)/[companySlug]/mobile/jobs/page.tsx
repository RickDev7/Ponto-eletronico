import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { requireEmployeeContext } from "@/lib/auth/guards";
import { loadEmployeeJobs } from "@/lib/employee/load-employee-jobs";
import { EmployeeJobsView } from "@/components/mobile/employee-jobs-view";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("employee.mobile.jobs");
  return { title: t("title") };
}

interface PageProps {
  params: Promise<{ companySlug: string }>;
}

export default async function MobileJobsPage({ params }: PageProps) {
  const { companySlug } = await params;
  const ctx = await requireEmployeeContext(companySlug);
  const jobData = await loadEmployeeJobs(ctx.company.id, ctx.employee.id);

  return (
    <EmployeeJobsView
      slug={companySlug}
      employeeId={ctx.employee.id}
      today={jobData.today}
      jobs={jobData.jobs}
      activeTaskId={jobData.activeTaskId}
    />
  );
}
