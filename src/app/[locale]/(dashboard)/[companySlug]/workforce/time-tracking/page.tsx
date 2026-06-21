import { redirect } from "@/i18n/navigation";
import { ROUTES } from "@/config/constants";

interface PageProps {
  params: Promise<{ companySlug: string; locale: string }>;
  searchParams: Promise<{ granularity?: string; date?: string }>;
}

/** Legacy time tracking → unified time bank hub. */
export default async function WorkforceTimeTrackingRedirectPage({
  params,
  searchParams,
}: PageProps) {
  const [{ companySlug, locale }, sp] = await Promise.all([params, searchParams]);
  redirect({
    href: ROUTES.workforceTimeBank(companySlug, {
      tab: "tracking",
      granularity: sp.granularity,
      date: sp.date,
    }),
    locale,
  });
}
