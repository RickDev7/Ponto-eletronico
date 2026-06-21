import { redirect } from "@/i18n/navigation";
import { ROUTES } from "@/config/constants";

interface PageProps {
  params: Promise<{ companySlug: string; locale: string }>;
}

/** Legacy CRM dashboard → unified Commercial hub. */
export default async function CrmDashboardRedirect({ params }: PageProps) {
  const { companySlug, locale } = await params;
  redirect({ href: ROUTES.crm(companySlug), locale });
}
