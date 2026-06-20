import { NextResponse, type NextRequest } from "next/server";
import { requireCompanyContext } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { getCsvLabels, timeLocaleForExport } from "@/lib/export/csv-labels";
import { getExportLocaleFromRequest } from "@/lib/export/locale-from-request";

function formatDuration(start: string, end: string | null): string {
  if (!end) return "";
  const diff = new Date(end).getTime() - new Date(start).getTime();
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  return `${h}:${String(m).padStart(2, "0")}`;
}

function escapeCsv(value: string | null | undefined): string {
  if (value == null) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function row(values: (string | null | undefined)[]): string {
  return values.map(escapeCsv).join(",");
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ companySlug: string }> },
) {
  const { companySlug } = await params;

  let ctx: Awaited<ReturnType<typeof requireCompanyContext>>;
  try {
    ctx = await requireCompanyContext({ slug: companySlug, minRole: "supervisor" });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const locale = getExportLocaleFromRequest(request);
  const labels = getCsvLabels(locale);
  const timeLocale = timeLocaleForExport(locale);

  const url = request.nextUrl;
  const periodStart = url.searchParams.get("from") ?? "";
  const periodEnd = url.searchParams.get("to") ?? "";
  const type = url.searchParams.get("type") ?? "checkins";
  const periodLabel = (value: string) => value || labels.reports.periodAll;

  const supabase = await createClient();

  if (type === "checkins") {
    const query = supabase
      .from("check_ins")
      .select(`
        id, check_in_at, check_out_at, check_in_notes, check_out_notes,
        check_in_latitude, check_in_longitude,
        employee:employees(full_name, employee_number),
        task:tasks(title, service_type, scheduled_date,
          address:addresses(street, house_number, city))
      `)
      .eq("company_id", ctx.company.id)
      .order("check_in_at", { ascending: true });

    if (periodStart) query.gte("check_in_at", periodStart + "T00:00:00");
    if (periodEnd) query.lte("check_in_at", periodEnd + "T23:59:59");

    const { data } = await query;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = (data ?? []).map((ci: any) => {
      const emp = Array.isArray(ci.employee) ? ci.employee[0] : ci.employee;
      const task = Array.isArray(ci.task) ? ci.task[0] : ci.task;
      const addr = Array.isArray(task?.address) ? task.address[0] : task?.address;
      const date = ci.check_in_at.slice(0, 10);
      const checkInTime = new Date(ci.check_in_at).toLocaleTimeString(timeLocale, {
        hour: "2-digit",
        minute: "2-digit",
      });
      const checkOutTime = ci.check_out_at
        ? new Date(ci.check_out_at).toLocaleTimeString(timeLocale, {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "";

      return row([
        emp?.full_name,
        emp?.employee_number,
        task?.title,
        task?.service_type,
        date,
        checkInTime,
        checkOutTime,
        formatDuration(ci.check_in_at, ci.check_out_at),
        addr ? `${addr.street} ${addr.house_number ?? ""}, ${addr.city}` : "",
        ci.check_in_notes,
        ci.check_out_notes,
      ]);
    });

    const csv = [row(labels.reports.checkins.headers), ...rows].join("\r\n");
    const filename = `${labels.reports.checkins.filenamePrefix}-${periodLabel(periodStart)}-${periodLabel(periodEnd)}.csv`;

    return new NextResponse("\uFEFF" + csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  }

  const { data } = await supabase
    .from("tasks")
    .select(`
      id, title, status, service_type, priority, scheduled_date,
      scheduled_start, scheduled_end, completed_at, description,
      address:addresses(street, house_number, city,
        client:clients(name)),
      assignments:task_assignments(
        employee:employees(full_name)
      )
    `)
    .eq("company_id", ctx.company.id)
    .gte("scheduled_date", periodStart || "2000-01-01")
    .lte("scheduled_date", periodEnd || "2100-12-31")
    .order("scheduled_date");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const taskRows = (data ?? []).map((t: any) => {
    const addr = Array.isArray(t.address) ? t.address[0] : t.address;
    const client = Array.isArray(addr?.client) ? addr.client[0] : addr?.client;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const employees = (t.assignments ?? []).map((a: any) => {
      const emp = Array.isArray(a.employee) ? a.employee[0] : a.employee;
      return emp?.full_name ?? "";
    }).filter(Boolean).join("; ");

    return row([
      t.title,
      labels.reports.statusLabels[t.status] ?? t.status,
      t.service_type,
      labels.reports.priorityLabels[t.priority] ?? t.priority,
      t.scheduled_date,
      t.scheduled_start ?? "",
      t.scheduled_end ?? "",
      t.completed_at ? t.completed_at.slice(0, 10) : "",
      client?.name ?? "",
      addr ? `${addr.street} ${addr.house_number ?? ""}, ${addr.city}` : "",
      employees,
      t.description ?? "",
    ]);
  });

  const csv = [row(labels.reports.tasks.headers), ...taskRows].join("\r\n");
  const filename = `${labels.reports.tasks.filenamePrefix}-${periodLabel(periodStart)}-${periodLabel(periodEnd)}.csv`;

  return new NextResponse("\uFEFF" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
