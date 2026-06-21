import { redirect } from "@/i18n/navigation";
import { ROUTES } from "@/config/constants";

interface PageProps {
  params: Promise<{ companySlug: string; locale: string }>;
  searchParams: Promise<{ page?: string }>;
}

/** Legacy activity feed → analytics operational hub. */
export default async function ActivityRedirectPage({ params, searchParams }: PageProps) {
  const [{ companySlug, locale }, sp] = await Promise.all([params, searchParams]);
  redirect({
    href: ROUTES.analyticsOperational(companySlug, {
      tab: "activity",
      page: sp.page,
    }),
    locale,
  });
}
