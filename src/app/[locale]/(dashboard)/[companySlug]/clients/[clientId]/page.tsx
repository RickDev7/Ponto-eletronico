import { getLocale } from "next-intl/server";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireCompanyContext } from "@/lib/auth/guards";
import { can } from "@/config/permissions";
import { LOCALE_DATE_MAP } from "@/lib/i18n/metadata";
import { loadClient360Data } from "@/lib/clients/load-client-360-data";
import { Client360View } from "@/components/features/clients/client-360-view";
import { AppShellPage } from "@/components/design-system/layout";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ clientId: string }>;
}): Promise<Metadata> {
  const { clientId } = await params;
  const t = await getTranslations("clients.client360");
  return { title: t("pageTitle", { id: clientId.slice(0, 8) }) };
}

interface PageProps {
  params: Promise<{ companySlug: string; clientId: string }>;
}

export default async function ClientDetailPage({ params }: PageProps) {
  const { companySlug, clientId } = await params;
  const ctx = await requireCompanyContext({ slug: companySlug, minRole: "supervisor" });
  const locale = await getLocale();
  const dateLocale = LOCALE_DATE_MAP[locale] ?? "en-US";

  const data = await loadClient360Data(ctx.company.id, clientId, companySlug);
  if (!data) notFound();

  return (
    <AppShellPage size="fluid">
      <Client360View
        slug={companySlug}
        data={data}
        locale={dateLocale}
        canWrite={can(ctx.membership.role, "clients:write")}
      />
    </AppShellPage>
  );
}
