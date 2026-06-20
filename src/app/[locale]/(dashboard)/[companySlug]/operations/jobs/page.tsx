import { getLocale } from "next-intl/server";
import { requireCompanyContext } from "@/lib/auth/guards";
import { OperationsJobsView } from "@/components/features/operations/operations-jobs-view";
import { loadExecutions } from "@/lib/operations/load-operations-data";
import { AppShellPage } from "@/components/design-system/layout";

interface PageProps {
  params: Promise<{ companySlug: string }>;
}

export default async function OperationsJobsPage({ params }: PageProps) {
  const { companySlug } = await params;
  const ctx = await requireCompanyContext({ slug: companySlug, minRole: "supervisor" });
  const locale = await getLocale();
  const dateLocale = locale === "en" ? "en-US" : "pt-BR";

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 30);
  const executions = await loadExecutions(
    ctx.company.id,
    weekStart.toISOString().slice(0, 10),
  );

  return (
    <AppShellPage size="fluid">
      <OperationsJobsView slug={companySlug} executions={executions} locale={dateLocale} />
    </AppShellPage>
  );
}
