import { redirect } from "@/i18n/navigation";
import { ROUTES } from "@/config/constants";

interface PageProps {
  params: Promise<{ companySlug: string; locale: string }>;
}

/** Legacy visits list → unified work orders hub. */
export default async function OperationsVisitsRedirectPage({ params }: PageProps) {
  const { companySlug, locale } = await params;
  redirect({ href: ROUTES.operationsWorkOrders(companySlug, { tab: "visits" }), locale });
}
