import { redirect } from "@/i18n/navigation";
import { ROUTES } from "@/config/constants";

interface PageProps {
  params: Promise<{ companySlug: string; locale: string }>;
}

/** Legacy employees list → workforce employees hub. */
export default async function EmployeesListRedirectPage({ params }: PageProps) {
  const { companySlug, locale } = await params;
  redirect({ href: ROUTES.workforceEmployees(companySlug), locale });
}
