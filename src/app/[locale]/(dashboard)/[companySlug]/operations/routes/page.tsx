import { requireCompanyContext } from "@/lib/auth/guards";
import { OperationsRoutesView } from "@/components/features/operations/operations-routes-view";
import { loadExecutions } from "@/lib/operations/load-operations-data";
import { AppShellPage } from "@/components/design-system/layout";

interface PageProps {
  params: Promise<{ companySlug: string }>;
  searchParams: Promise<{ date?: string }>;
}

export default async function OperationsRoutesPage({ params, searchParams }: PageProps) {
  const [{ companySlug }, sp] = await Promise.all([params, searchParams]);
  const ctx = await requireCompanyContext({ slug: companySlug, minRole: "supervisor" });
  const date = sp.date ?? new Date().toISOString().slice(0, 10);

  const executions = await loadExecutions(ctx.company.id, date, date);

  return (
    <AppShellPage size="fluid">
      <OperationsRoutesView slug={companySlug} executions={executions} date={date} />
    </AppShellPage>
  );
}
