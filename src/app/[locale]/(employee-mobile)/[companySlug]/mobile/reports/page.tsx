import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { requireEmployeeContext } from "@/lib/auth/guards";
import { EmployeeReportsView } from "@/components/employee/employee-reports-view";
import { loadEmployeeServiceReports } from "@/lib/employee/load-employee-reports";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("employee.mobile.reports");
  return { title: t("title") };
}

interface PageProps {
  params: Promise<{ companySlug: string }>;
}

export default async function MobileReportsPage({ params }: PageProps) {
  const { companySlug } = await params;
  const ctx = await requireEmployeeContext(companySlug);
  const reports = await loadEmployeeServiceReports(ctx.company.id, ctx.employee.id);

  return <EmployeeReportsView slug={companySlug} reports={reports} />;
}
