import { redirect } from "@/i18n/navigation";
import { ROUTES } from "@/config/constants";

interface PageProps {
  params: Promise<{ companySlug: string; employeeId: string; locale: string }>;
}

/** Legacy employee detail → workforce employee profile. */
export default async function EmployeeDetailRedirectPage({ params }: PageProps) {
  const { companySlug, employeeId, locale } = await params;
  redirect({ href: ROUTES.workforceEmployee(companySlug, employeeId), locale });
}
