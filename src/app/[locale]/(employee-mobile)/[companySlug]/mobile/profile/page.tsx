import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { requireEmployeeMobileAccess } from "@/lib/auth/guards";
import { EmployeeMobileProfileView } from "@/components/mobile/employee-mobile-profile-view";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("employee.mobile.profile");
  return { title: t("title") };
}

interface PageProps {
  params: Promise<{ companySlug: string }>;
}

export default async function MobileProfilePage({ params }: PageProps) {
  const { companySlug } = await params;
  const ctx = await requireEmployeeMobileAccess(companySlug);

  return <EmployeeMobileProfileView slug={companySlug} ctx={ctx} />;
}
