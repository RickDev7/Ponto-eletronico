import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { requireCompanyContext } from "@/lib/auth/guards";
import { MobileAccessView } from "@/components/features/mobile/mobile-access-view";
import { ROUTES } from "@/config/constants";
import { AppShellPage } from "@/components/design-system/layout";

interface PageProps {
  params: Promise<{ companySlug: string }>;
  searchParams: Promise<{ reason?: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("employee.mobile.access");
  return { title: t("pageTitle") };
}

export default async function MobileAccessPage({ params, searchParams }: PageProps) {
  const { companySlug } = await params;
  const { reason } = await searchParams;
  await requireCompanyContext({ slug: companySlug });

  const mobilePath = ROUTES.mobile(companySlug);
  const accessReason = reason === "profile_missing" ? "profile_missing" : "admin";

  return (
    <AppShellPage size="default">
      <MobileAccessView slug={companySlug} reason={accessReason} mobilePath={mobilePath} />
    </AppShellPage>
  );
}
