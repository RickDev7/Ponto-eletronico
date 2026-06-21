import { getLocale } from "next-intl/server";
import { requireCompanyContext } from "@/lib/auth/guards";
import { can } from "@/config/permissions";
import { OperationsMaterialsView } from "@/components/features/operations/operations-materials-view";
import { loadMaterialDashboard } from "@/lib/materials/load-material-data";
import { loadServices } from "@/lib/operations/load-operations-data";
import { loadWorkforceEmployees } from "@/lib/workforce/load-workforce-data";
import { AppShellPage } from "@/components/design-system/layout";

interface PageProps {
  params: Promise<{ companySlug: string }>;
}

export default async function OperationsMaterialsPage({ params }: PageProps) {
  const { companySlug } = await params;
  const locale = await getLocale();
  const ctx = await requireCompanyContext({ slug: companySlug, minRole: "supervisor" });

  const [data, services, employees] = await Promise.all([
    loadMaterialDashboard(ctx.company.id),
    loadServices(ctx.company.id),
    loadWorkforceEmployees(ctx.company.id),
  ]);

  return (
    <AppShellPage size="fluid">
      <OperationsMaterialsView
        slug={companySlug}
        data={data}
        services={services.filter((s) => s.is_active)}
        employees={employees.filter((e) => e.status === "active")}
        locale={locale === "en" ? "en" : "pt"}
        canWrite={can(ctx.membership.role, "tasks:write")}
      />
    </AppShellPage>
  );
}
