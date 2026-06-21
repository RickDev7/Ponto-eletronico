import { getLocale } from "next-intl/server";
import { requireCompanyContext } from "@/lib/auth/guards";
import { can } from "@/config/permissions";
import { OperationsHubView } from "@/components/features/operations/operations-hub-view";
import { loadOperationsHubData } from "@/lib/operations/load-operations-hub-data";
import { AppShellPage } from "@/components/design-system/layout";

interface PageProps {
  params: Promise<{ companySlug: string }>;
}

export default async function OperationsDashboardPage({ params }: PageProps) {
  const { companySlug } = await params;
  const ctx = await requireCompanyContext({ slug: companySlug, minRole: "supervisor" });
  const locale = await getLocale();

  const data = await loadOperationsHubData(ctx.company.id);

  return (
    <AppShellPage size="fluid">
      <OperationsHubView
        slug={companySlug}
        data={data}
        locale={locale}
        canWrite={can(ctx.membership.role, "tasks:write")}
      />
    </AppShellPage>
  );
}
