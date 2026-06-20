import { NextResponse } from "next/server";
import { requireCompanyContext } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { buildAuditViolations } from "@/lib/audits/violations";
import { getCsvLabels, timeLocaleForExport } from "@/lib/export/csv-labels";
import { getExportLocaleFromRequest } from "@/lib/export/locale-from-request";

function toCsvRow(fields: (string | number | boolean | null | undefined)[]): string {
  return fields
    .map((f) => {
      if (f == null) return "";
      const s = String(f).replace(/"/g, '""');
      return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s}"` : s;
    })
    .join(",");
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ companySlug: string }> },
) {
  const { companySlug } = await params;
  const ctx = await requireCompanyContext({ slug: companySlug, minRole: "supervisor" });
  const locale = getExportLocaleFromRequest(request);
  const labels = getCsvLabels(locale);
  const timeLocale = timeLocaleForExport(locale);

  const { searchParams } = new URL(request.url);
  const daysParam = Number(searchParams.get("days") ?? "14");
  const days = [7, 14, 30].includes(daysParam) ? daysParam : 14;

  const from = new Date();
  from.setDate(from.getDate() - days);
  const fromIso = from.toISOString();

  const supabase = await createClient();
  const { data: checkIns } = await supabase
    .from("check_ins")
    .select(`
      id, check_in_at, check_out_at, check_in_latitude, check_in_longitude,
      employee:employees(full_name),
      task:tasks(
        id, title, scheduled_date,
        address:addresses(street, house_number, city, latitude, longitude)
      )
    `)
    .eq("company_id", ctx.company.id)
    .gte("check_in_at", fromIso)
    .order("check_in_at", { ascending: false })
    .limit(300);

  const rows = buildAuditViolations(checkIns ?? []).map((row) =>
    toCsvRow([
      labels.audits.typeLabels[row.type],
      row.employee,
      row.taskTitle,
      row.addressLabel,
      new Date(row.checkInAt).toLocaleString(timeLocale),
      row.distance != null ? Math.round(row.distance) : "",
    ]),
  );

  const csv = "\uFEFF" + [labels.audits.headers.join(","), ...rows].join("\r\n");
  const filename = `${labels.audits.filenamePrefix}_${days}d_${companySlug}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
