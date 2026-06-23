import { redirect } from "@/i18n/navigation";
import { ROUTES } from "@/config/constants";

interface PageProps {
  params: Promise<{ companySlug: string; locale: string }>;
}

/** Legacy route — alerts live in Messages tab. */
export default async function MobileNotificationsPage({ params }: PageProps) {
  const { companySlug, locale } = await params;
  redirect({
    href: `${ROUTES.mobileMessages(companySlug)}?tab=alerts`,
    locale,
  });
}
