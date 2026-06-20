import { requireCompanyContext } from "@/lib/auth/guards";
import { can } from "@/config/permissions";
import { seedDefaultServicesAction } from "@/actions/operations/actions";
import { OperationsServicesView } from "@/components/features/operations/operations-services-view";
import { loadServices } from "@/lib/operations/load-operations-data";
import { AppShellPage } from "@/components/design-system/layout";

interface PageProps {
  params: Promise<{ companySlug: string }>;
}

export default async function OperationsServicesPage({ params }: PageProps) {
  const { companySlug } = await params;
  const ctx = await requireCompanyContext({ slug: companySlug, minRole: "supervisor" });

  await seedDefaultServicesAction(companySlug);
  const services = await loadServices(ctx.company.id);

  return (
    <AppShellPage size="fluid">
      <OperationsServicesView
        slug={companySlug}
        services={services}
        canWrite={can(ctx.membership.role, "tasks:write")}
      />
    </AppShellPage>
  );
}
