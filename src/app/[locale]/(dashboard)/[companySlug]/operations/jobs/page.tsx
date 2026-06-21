import { redirect } from "@/i18n/navigation";
import { ROUTES } from "@/config/constants";

interface PageProps {
  params: Promise<{ companySlug: string; locale: string }>;
  searchParams: Promise<{ tab?: string }>;
}

/** Legacy jobs route → canonical work orders hub. */
export default async function OperationsJobsRedirectPage({ params, searchParams }: PageProps) {
  const [{ companySlug, locale }, sp] = await Promise.all([params, searchParams]);
  redirect({
    href: ROUTES.operationsWorkOrders(companySlug, {
      tab: sp.tab === "visits" ? "visits" : undefined,
    }),
    locale,
  });
}
