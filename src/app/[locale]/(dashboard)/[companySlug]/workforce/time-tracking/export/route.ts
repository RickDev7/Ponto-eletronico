import { NextResponse } from "next/server";
import { requireCompanyContext } from "@/lib/auth/guards";
import { loadTimeTrackingReport } from "@/lib/time-tracking/load-time-tracking-data";
import { buildPayrollCsv } from "@/lib/time-tracking/payroll-export";
import type { TimeReportGranularity } from "@/lib/time-tracking/compute-time-summary";
import { getExportLocaleFromRequest } from "@/lib/export/locale-from-request";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ companySlug: string }> },
) {
  const { companySlug } = await params;
  const ctx = await requireCompanyContext({ slug: companySlug, minRole: "supervisor" });
  const locale = getExportLocaleFromRequest(request);
  const { searchParams } = new URL(request.url);

  const granularity = (["daily", "weekly", "monthly"].includes(searchParams.get("granularity") ?? "")
    ? searchParams.get("granularity")
    : "monthly") as TimeReportGranularity;
  const anchorDate = searchParams.get("date") ?? new Date().toISOString().slice(0, 10);

  const report = await loadTimeTrackingReport(
    ctx.company.id,
    granularity,
    anchorDate,
    locale,
  );

  const csv = buildPayrollCsv(report.rows, locale);
  const filename = `payroll-${granularity}-${report.from}-${report.to}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
