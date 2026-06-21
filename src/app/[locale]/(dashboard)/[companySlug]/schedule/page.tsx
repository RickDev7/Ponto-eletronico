import { redirect } from "@/i18n/navigation";
import { ROUTES } from "@/config/constants";

interface PageProps {
  params: Promise<{ companySlug: string; locale: string }>;
  searchParams: Promise<{ week?: string }>;
}

/** Legacy service schedule grid → operations scheduling. */
export default async function ScheduleRedirectPage({ params, searchParams }: PageProps) {
  const [{ companySlug, locale }, sp] = await Promise.all([params, searchParams]);
  redirect({
    href: ROUTES.operationsScheduling(companySlug, { view: "week", week: sp.week }),
    locale,
  });
}
