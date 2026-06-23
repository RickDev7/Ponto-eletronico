import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { requireEmployeeContext } from "@/lib/auth/guards";
import { loadEmployeeHours } from "@/lib/employee/load-employee-hours";
import { EmployeeHoursView } from "@/components/employee/employee-hours-view";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("employee.mobile.hours");
  return { title: t("title") };
}

interface PageProps {
  params: Promise<{ companySlug: string }>;
}

export default async function MobileHoursPage({ params }: PageProps) {
  const { companySlug } = await params;
  const ctx = await requireEmployeeContext(companySlug);
  const summary = await loadEmployeeHours(ctx.company.id, ctx.employee.id);

  return <EmployeeHoursView slug={companySlug} summary={summary} />;
}
