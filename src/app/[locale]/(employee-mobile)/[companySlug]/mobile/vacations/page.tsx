import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { requireEmployeeContext } from "@/lib/auth/guards";
import { EmployeeVacationsView } from "@/components/employee/employee-vacations-view";
import { loadEmployeeVacationRequests } from "@/lib/employee/load-employee-vacations";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("employee.mobile.vacations");
  return { title: t("title") };
}

interface PageProps {
  params: Promise<{ companySlug: string }>;
}

export default async function MobileVacationsPage({ params }: PageProps) {
  const { companySlug } = await params;
  const ctx = await requireEmployeeContext(companySlug);
  const { requests, summary } = await loadEmployeeVacationRequests(
    ctx.company.id,
    ctx.employee.id,
  );

  return (
    <EmployeeVacationsView slug={companySlug} requests={requests} summary={summary} />
  );
}
