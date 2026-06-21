import { redirect } from "@/i18n/navigation";
import { ROUTES } from "@/config/constants";

interface PageProps {
  params: Promise<{ companySlug: string; locale: string }>;
  searchParams: Promise<{ month?: string; year?: string }>;
}

/** Legacy operations calendar → canonical tenant calendar. */
export default async function OperationsCalendarRedirectPage({ params, searchParams }: PageProps) {
  const [{ companySlug, locale }, sp] = await Promise.all([params, searchParams]);
  redirect({
    href: ROUTES.calendar(companySlug, sp),
    locale,
  });
}
