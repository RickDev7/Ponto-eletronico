import { redirect } from "@/i18n/navigation";
import { ROUTES } from "@/config/constants";

interface PageProps {
  params: Promise<{ companySlug: string; locale: string }>;
  searchParams: Promise<{ days?: string }>;
}

/** Legacy audits → analytics operational hub. */
export default async function AuditsRedirectPage({ params, searchParams }: PageProps) {
  const [{ companySlug, locale }, sp] = await Promise.all([params, searchParams]);
  redirect({
    href: ROUTES.analyticsOperational(companySlug, {
      tab: "audits",
      days: sp.days,
    }),
    locale,
  });
}
