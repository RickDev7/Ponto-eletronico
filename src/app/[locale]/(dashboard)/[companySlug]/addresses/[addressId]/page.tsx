import { redirect } from "@/i18n/navigation";
import { ROUTES } from "@/config/constants";

interface PageProps {
  params: Promise<{ companySlug: string; addressId: string; locale: string }>;
}

/** Legacy route → unified Operations property workspace. */
export default async function AddressDetailRedirect({ params }: PageProps) {
  const { companySlug, addressId, locale } = await params;
  redirect({ href: ROUTES.operationsProperty(companySlug, addressId), locale });
}
