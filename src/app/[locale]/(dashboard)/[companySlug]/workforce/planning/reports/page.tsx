import { requireCompanyContext } from "@/lib/auth/guards";
import { PlanningReportsView } from "@/components/features/workforce/planning-reports-view";
import { loadPlanningPageData } from "@/lib/workforce/load-workforce-data";
import { loadPlanningProfitability } from "@/lib/workforce/load-planning-profitability";
import { AppShellPage } from "@/components/design-system/layout";

interface PageProps {
  params: Promise<{ companySlug: string }>;
  searchParams: Promise<{ from?: string; to?: string }>;
}

function monthBounds(date: Date) {
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const last = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return {
    from: first.toISOString().slice(0, 10),
    to: last.toISOString().slice(0, 10),
  };
}

export default async function PlanningReportsPage({ params, searchParams }: PageProps) {
  const [{ companySlug }, sp] = await Promise.all([params, searchParams]);
  const ctx = await requireCompanyContext({ slug: companySlug, minRole: "supervisor" });

  const defaults = monthBounds(new Date());
  const from = sp.from ?? defaults.from;
  const to = sp.to ?? defaults.to;

  const data = await loadPlanningPageData(ctx.company.id, from, to);
  const profitability = await loadPlanningProfitability(
    ctx.company.id,
    from,
    to,
    data.shifts,
    data.employees,
  );

  return (
    <AppShellPage size="fluid">
      <PlanningReportsView
        slug={companySlug}
        companyName={ctx.company.name}
        from={from}
        to={to}
        shifts={data.shifts}
        summaries={data.summaries}
        profitability={profitability}
      />
    </AppShellPage>
  );
}
