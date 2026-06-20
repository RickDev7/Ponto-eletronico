import { NextResponse } from "next/server";
import { getLocale } from "next-intl/server";
import { requireCompanyContext } from "@/lib/auth/guards";
import { getFinanceDashboardData } from "@/lib/finance/dashboard-data";
import { formatMoney } from "@/lib/finance/utils";

interface RouteProps {
  params: Promise<{ companySlug: string }>;
}

export async function GET(_request: Request, { params }: RouteProps) {
  const { companySlug } = await params;
  const ctx = await requireCompanyContext({ slug: companySlug, minRole: "supervisor" });
  const locale = await getLocale();
  const dateLocale = locale === "en" ? "en-US" : "pt-BR";
  const data = await getFinanceDashboardData(companySlug);

  const rows = [
    ["Metric", "Value"],
    ["Monthly Revenue", formatMoney(data.kpis.monthlyRevenueCents, "EUR", dateLocale)],
    ["Projected Revenue", formatMoney(data.kpis.projectedRevenueCents, "EUR", dateLocale)],
    ["Pending Invoices", String(data.kpis.pendingInvoicesCount)],
    ["Overdue Invoices", String(data.kpis.overdueInvoicesCount)],
    ["Conversion Rate", `${data.kpis.conversionRate}%`],
    [],
    ["Month", "Revenue", "Expenses", "Profit"],
    ...data.chartPoints.map((p) => [
      p.label,
      formatMoney(p.revenue, "EUR", dateLocale),
      formatMoney(p.expenses, "EUR", dateLocale),
      formatMoney(p.profit, "EUR", dateLocale),
    ]),
  ];

  const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
  const bom = "\uFEFF";

  return new NextResponse(bom + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="finance-report-${ctx.company.slug}.csv"`,
    },
  });
}
