import { redirectTo } from "@/i18n/server-redirect";
import { ROUTES } from "@/config/constants";

interface PageProps {
  params: Promise<{ companySlug: string }>;
}

/** Legacy route — employees use /mobile as canonical workspace. */
export default async function MinhaAreaPage({ params }: PageProps) {
  const { companySlug } = await params;
  await redirectTo(ROUTES.mobile(companySlug));
}
