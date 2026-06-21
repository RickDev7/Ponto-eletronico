import { getLocale } from "next-intl/server";
import { requireCompanyContext } from "@/lib/auth/guards";
import { can } from "@/config/permissions";
import { OperationsEquipmentView } from "@/components/features/operations/operations-equipment-view";
import { loadEquipmentDashboard } from "@/lib/equipment/load-equipment-data";
import { loadServices } from "@/lib/operations/load-operations-data";
import { loadWorkforceEmployees } from "@/lib/workforce/load-workforce-data";
import { AppShellPage } from "@/components/design-system/layout";

interface PageProps {
  params: Promise<{ companySlug: string }>;
}

export default async function OperationsEquipmentPage({ params }: PageProps) {
  const { companySlug } = await params;
  const locale = await getLocale();
  const ctx = await requireCompanyContext({ slug: companySlug, minRole: "supervisor" });

  const [data, employees, services] = await Promise.all([
    loadEquipmentDashboard(ctx.company.id),
    loadWorkforceEmployees(ctx.company.id),
    loadServices(ctx.company.id),
  ]);

  return (
    <AppShellPage size="fluid">
      <OperationsEquipmentView
        slug={companySlug}
        data={data}
        employees={employees.filter((e) => e.status === "active")}
        services={services.filter((s) => s.is_active)}
        locale={locale === "en" ? "en" : "pt"}
        canWrite={can(ctx.membership.role, "tasks:write")}
      />
    </AppShellPage>
  );
}
