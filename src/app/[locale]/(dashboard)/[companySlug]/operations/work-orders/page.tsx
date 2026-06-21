import { getLocale } from "next-intl/server";
import { requireCompanyContext } from "@/lib/auth/guards";
import {
  OperationsWorkOrdersView,
  type WorkOrdersTab,
} from "@/components/features/operations/operations-work-orders-view";
import { loadTraceableExecutions } from "@/lib/operations/load-operations-hub-data";
import { AppShellPage } from "@/components/design-system/layout";

interface PageProps {
  params: Promise<{ companySlug: string }>;
  searchParams: Promise<{ tab?: string }>;
}

export default async function OperationsWorkOrdersPage({ params, searchParams }: PageProps) {
  const [{ companySlug }, sp] = await Promise.all([params, searchParams]);
  const ctx = await requireCompanyContext({ slug: companySlug, minRole: "supervisor" });
  const locale = await getLocale();
  const dateLocale = locale === "en" ? "en-US" : "pt-BR";

  const tab: WorkOrdersTab = sp.tab === "visits" ? "visits" : "jobs";
  const rangeStart = new Date();
  rangeStart.setDate(rangeStart.getDate() - 90);

  const executions = await loadTraceableExecutions(
    ctx.company.id,
    rangeStart.toISOString().slice(0, 10),
  );

  return (
    <AppShellPage size="fluid">
      <OperationsWorkOrdersView
        slug={companySlug}
        locale={dateLocale}
        tab={tab}
        executions={executions}
      />
    </AppShellPage>
  );
}
