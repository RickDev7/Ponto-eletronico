import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { requireEmployeeMobileAccess } from "@/lib/auth/guards";
import { loadEmployeeHome } from "@/lib/employee/load-employee-home";
import { EmployeeHomeView } from "@/components/mobile/employee-home-view";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("employee.mobile.home");
  return { title: t("title") };
}

interface PageProps {
  params: Promise<{ companySlug: string }>;
}

export default async function MobileHomePage({ params }: PageProps) {
  const { companySlug } = await params;
  const tNav = await getTranslations("navigation");
  const ctx = await requireEmployeeMobileAccess(companySlug);

  if (!ctx.employee) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center p-8 text-center">
        <p className="text-sm text-muted-foreground">{tNav("noEmployeeProfile")}</p>
      </div>
    );
  }

  const homeData = await loadEmployeeHome(
    ctx.company.id,
    ctx.employee.id,
    ctx.profile.full_name,
  );

  return <EmployeeHomeView slug={companySlug} employeeId={ctx.employee.id} data={homeData} />;
}
