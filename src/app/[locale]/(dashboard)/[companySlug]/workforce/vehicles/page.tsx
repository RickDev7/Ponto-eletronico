import { getLocale } from "next-intl/server";
import { requireCompanyContext } from "@/lib/auth/guards";
import { can } from "@/config/permissions";
import { WorkforceVehiclesView } from "@/components/features/workforce/workforce-vehicles-view";
import { loadVehicleDashboard } from "@/lib/vehicles/load-vehicle-data";
import { loadWorkforceEmployees } from "@/lib/workforce/load-workforce-data";
import { AppShellPage } from "@/components/design-system/layout";

interface PageProps {
  params: Promise<{ companySlug: string }>;
}

export default async function WorkforceVehiclesPage({ params }: PageProps) {
  const { companySlug } = await params;
  const locale = await getLocale();
  const ctx = await requireCompanyContext({ slug: companySlug, minRole: "supervisor" });

  const [data, employees] = await Promise.all([
    loadVehicleDashboard(ctx.company.id),
    loadWorkforceEmployees(ctx.company.id),
  ]);

  return (
    <AppShellPage size="fluid">
      <WorkforceVehiclesView
        slug={companySlug}
        data={data}
        employees={employees.filter((e) => e.status === "active")}
        locale={locale === "en" ? "en" : "pt"}
        canWrite={can(ctx.membership.role, "tasks:write")}
      />
    </AppShellPage>
  );
}
