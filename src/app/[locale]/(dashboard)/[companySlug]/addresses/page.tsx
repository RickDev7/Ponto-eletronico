import { redirect } from "@/i18n/navigation";
import { ROUTES } from "@/config/constants";

interface PageProps {
  params: Promise<{ companySlug: string; locale: string }>;
}

/** Legacy addresses list → Operations properties hub. */
export default async function AddressesListRedirect({ params }: PageProps) {
  const { companySlug, locale } = await params;
  redirect({ href: ROUTES.operationsProperties(companySlug), locale });
}
