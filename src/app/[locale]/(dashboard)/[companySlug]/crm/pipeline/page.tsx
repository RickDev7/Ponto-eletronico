import { redirect } from "@/i18n/navigation";
import { ROUTES } from "@/config/constants";

interface PageProps {
  params: Promise<{ companySlug: string; locale: string }>;
}

/** Legacy CRM pipeline → unified commercial pipeline. */
export default async function CrmPipelineRedirectPage({ params }: PageProps) {
  const { companySlug, locale } = await params;
  redirect({ href: ROUTES.commercialPipeline(companySlug), locale });
}
