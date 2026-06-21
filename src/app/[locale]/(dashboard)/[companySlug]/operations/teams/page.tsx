import { redirect } from "@/i18n/navigation";
import { ROUTES } from "@/config/constants";

interface PageProps {
  params: Promise<{ companySlug: string; locale: string }>;
}

/** Legacy operations teams → canonical workforce teams. */
export default async function OperationsTeamsRedirectPage({ params }: PageProps) {
  const { companySlug, locale } = await params;
  redirect({ href: ROUTES.workforceTeams(companySlug), locale });
}
