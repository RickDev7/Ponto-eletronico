import { redirect } from "next/navigation";
import { ROUTES } from "@/config/constants";

interface PageProps {
  params: Promise<{ companySlug: string }>;
  searchParams: Promise<{ view?: string; week?: string }>;
}

export default async function WorkforceShiftsRedirectPage({ params, searchParams }: PageProps) {
  const [{ companySlug }, sp] = await Promise.all([params, searchParams]);
  redirect(
    ROUTES.workforcePlanning(companySlug, {
      view: sp.view,
      week: sp.week,
    }),
  );
}
