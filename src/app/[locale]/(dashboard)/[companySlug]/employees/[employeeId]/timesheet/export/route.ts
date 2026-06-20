import { NextResponse } from "next/server";
import { requireCompanyContext } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
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

function formatMinutes(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}:${String(m).padStart(2, "0")}`;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ companySlug: string; employeeId: string }> },
) {
  const { companySlug, employeeId } = await params;
  const ctx = await requireCompanyContext({ slug: companySlug, minRole: "supervisor" });
  const supabase = await createClient();
  const locale = getExportLocaleFromRequest(request);
  const labels = getCsvLabels(locale);
  const timeLocale = timeLocaleForExport(locale);

  const { searchParams } = new URL(request.url);
  const now = new Date();
  const year = parseInt(searchParams.get("year") ?? String(now.getFullYear()), 10);
  const month = parseInt(searchParams.get("month") ?? String(now.getMonth() + 1), 10);

  const monthStart = new Date(year, month - 1, 1).toISOString();
  const monthEnd = new Date(year, month, 0, 23, 59, 59).toISOString();

  const { data: employee } = await supabase
    .from("employees")
    .select("full_name, employee_number")
    .eq("id", employeeId)
    .eq("company_id", ctx.company.id)
    .single();

  if (!employee) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: checkIns } = await supabase
    .from("check_ins")
    .select(`
      check_in_at, check_out_at, check_in_notes, check_out_notes,
      task:tasks(title, service_type,
        address:addresses(street, city))
    `)
    .eq("employee_id", employeeId)
    .eq("company_id", ctx.company.id)
    .gte("check_in_at", monthStart)
    .lte("check_in_at", monthEnd)
    .order("check_in_at", { ascending: true });

  const rows = (checkIns ?? [])
    .filter((ci) => ci.check_out_at)
    .map((ci) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const task = Array.isArray(ci.task) ? (ci.task[0] as any) : (ci.task as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const address = Array.isArray(task?.address) ? (task.address[0] as any) : (task?.address as any);
      const mins = Math.floor(
        (new Date(ci.check_out_at!).getTime() - new Date(ci.check_in_at).getTime()) / 60_000,
      );
      const notes = [ci.check_in_notes, ci.check_out_notes].filter(Boolean).join(" / ");
      return [
        ci.check_in_at.slice(0, 10),
        new Date(ci.check_in_at).toLocaleTimeString(timeLocale, { hour: "2-digit", minute: "2-digit" }),
        new Date(ci.check_out_at!).toLocaleTimeString(timeLocale, { hour: "2-digit", minute: "2-digit" }),
        formatMinutes(mins),
        task?.title ?? "",
        task?.service_type ?? "",
        address ? `${address.street ?? ""}, ${address.city ?? ""}` : "",
        notes,
      ];
    });

  const csv = "\uFEFF" + [labels.timesheet.headers.join(","), ...rows.map(toCsvRow)].join("\r\n");
  const monthLabel = `${year}-${String(month).padStart(2, "0")}`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${labels.timesheet.filenamePrefix}_${employee.employee_number ?? employeeId}_${monthLabel}.csv"`,
    },
  });
}
