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

function buildCsv(headers: string[], rows: (string | number | boolean | null | undefined)[][]): string {
  return "\uFEFF" + [headers.join(","), ...rows.map(toCsvRow)].join("\r\n");
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ companySlug: string }> },
) {
  const { companySlug } = await params;
  const ctx = await requireCompanyContext({ slug: companySlug, minRole: "admin" });
  const supabase = await createClient();
  const companyId = ctx.company.id;
  const locale = getExportLocaleFromRequest(request);
  const labels = getCsvLabels(locale);

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") ?? "all";

  if (type === "employees") {
    const { data } = await supabase
      .from("employees")
      .select("employee_number, full_name, email, phone, address, status, created_at")
      .eq("company_id", companyId)
      .order("full_name");

    const csv = buildCsv(
      labels.employees.headers,
      (data ?? []).map((e) => [
        e.employee_number, e.full_name, e.email, e.phone,
        e.address, e.status, e.created_at?.slice(0, 10),
      ]),
    );
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${labels.employees.filename}_${companySlug}.csv"`,
      },
    });
  }

  if (type === "clients") {
    const { data } = await supabase
      .from("clients")
      .select("name, legal_name, email, phone, address, tax_id, status, notes, created_at")
      .eq("company_id", companyId)
      .order("name");

    const csv = buildCsv(
      labels.clients.headers,
      (data ?? []).map((c) => [
        c.name, c.legal_name, c.email, c.phone,
        c.address, c.tax_id, c.status, c.notes, c.created_at?.slice(0, 10),
      ]),
    );
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${labels.clients.filename}_${companySlug}.csv"`,
      },
    });
  }

  if (type === "addresses") {
    const { data } = await supabase
      .from("addresses")
      .select(`
        label, street, house_number, postal_code, city, country,
        floor, unit_number, access_notes, is_active,
        client:clients(name)
      `)
      .eq("company_id", companyId)
      .order("city");

    const csv = buildCsv(
      labels.addresses.headers,
      (data ?? []).map((a) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const client = Array.isArray(a.client) ? (a.client as any[])[0] : a.client;
        return [
          a.label, a.street, a.house_number, a.postal_code,
          a.city, a.country, a.floor, a.unit_number,
          a.access_notes, a.is_active ? labels.yesNo.yes : labels.yesNo.no, client?.name,
        ];
      }),
    );
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${labels.addresses.filename}_${companySlug}.csv"`,
      },
    });
  }

  const { data } = await supabase
    .from("tasks")
    .select(`
      title, service_type, status, priority, scheduled_date,
      scheduled_start, scheduled_end,
      description,
      address:addresses(street, house_number, city, postal_code),
      assignments:task_assignments(employee:employees(full_name))
    `)
    .eq("company_id", companyId)
    .order("scheduled_date", { ascending: false });

  const csv = buildCsv(
    labels.tasks.headers,
    (data ?? []).map((t) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const addr = Array.isArray(t.address) ? (t.address as any[])[0] : (t.address as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const employees = (t.assignments as any[])
        ?.map((a) => (Array.isArray(a.employee) ? a.employee[0] : a.employee)?.full_name)
        .filter(Boolean)
        .join("; ");
      const addrStr = addr
        ? `${addr.street} ${addr.house_number}, ${addr.postal_code} ${addr.city}`
        : "";
      return [
        t.title, t.service_type, t.status, t.priority,
        t.scheduled_date, t.scheduled_start, t.scheduled_end,
        employees, addrStr, t.description,
      ];
    }),
  );

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${labels.tasks.filename}_${companySlug}.csv"`,
    },
  });
}
