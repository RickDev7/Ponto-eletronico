import { redirect } from "@/i18n/navigation";
import { ROUTES } from "@/config/constants";

interface PageProps {
  params: Promise<{ companySlug: string; locale: string }>;
}

/** Legacy timesheets → unified time bank hub. */
export default async function WorkforceTimesheetsRedirectPage({ params }: PageProps) {
  const { companySlug, locale } = await params;
  redirect({ href: ROUTES.workforceTimeBank(companySlug, { tab: "timesheets" }), locale });
}
