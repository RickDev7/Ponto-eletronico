"use server";

import { revalidatePath } from "next/cache";
import { requireCompanyContext } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/actions/auth/actions";
import type { ReportType } from "@/types";

export async function createReport(
  slug: string,
  input: {
    reportType: ReportType;
    title: string;
    periodStart?: string;
    periodEnd?: string;
    metadata?: Record<string, unknown>;
  },
): Promise<ActionResult<{ id: string }>> {
  const ctx = await requireCompanyContext({ slug, minRole: "supervisor" });
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("reports")
    .insert({
      company_id: ctx.company.id,
      report_type: input.reportType,
      title: input.title,
      period_start: input.periodStart ?? null,
      period_end: input.periodEnd ?? null,
      generated_by: ctx.profile.id,
      metadata: input.metadata ?? {},
    })
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };

  revalidatePath(`/${slug}/reports`);
  return { success: true, data: { id: data.id } };
}

export interface ReportData {
  company: { name: string; legal_name: string | null };
  period: { start: string; end: string };
  tasks: Array<{
    id: string;
    title: string;
    status: string;
    service_type: string;
    scheduled_date: string;
    completed_at: string | null;
    address: { street: string; house_number: string | null; city: string } | null;
    check_ins: Array<{
      employee_name: string;
      check_in_at: string;
      check_out_at: string | null;
    }>;
  }>;
  summary: {
    total: number;
    completed: number;
    in_progress: number;
    total_checkins: number;
  };
}

export async function getReportData(
  slug: string,
  periodStart: string,
  periodEnd: string,
): Promise<ActionResult<ReportData>> {
  const ctx = await requireCompanyContext({ slug, minRole: "supervisor" });
  const supabase = await createClient();

  const { data: tasks, error } = await supabase
    .from("tasks")
    .select(`
      id, title, status, service_type, scheduled_date, completed_at,
      address:addresses(street, house_number, city),
      check_ins(
        check_in_at, check_out_at,
        employee:employees(full_name)
      )
    `)
    .eq("company_id", ctx.company.id)
    .gte("scheduled_date", periodStart)
    .lte("scheduled_date", periodEnd)
    .neq("status", "cancelled")
    .order("scheduled_date");

  if (error) return { success: false, error: error.message };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapped = (tasks ?? []).map((t: any) => ({
    id: t.id,
    title: t.title,
    status: t.status,
    service_type: t.service_type,
    scheduled_date: t.scheduled_date,
    completed_at: t.completed_at,
    address: Array.isArray(t.address) ? t.address[0] : t.address,
    check_ins: (t.check_ins ?? []).map((ci: any) => ({
      employee_name: Array.isArray(ci.employee)
        ? ci.employee[0]?.full_name
        : ci.employee?.full_name ?? "—",
      check_in_at: ci.check_in_at,
      check_out_at: ci.check_out_at,
    })),
  }));

  return {
    success: true,
    data: {
      company: {
        name: ctx.company.name,
        legal_name: ctx.company.legal_name,
      },
      period: { start: periodStart, end: periodEnd },
      tasks: mapped,
      summary: {
        total: mapped.length,
        completed: mapped.filter((t) => t.status === "completed").length,
        in_progress: mapped.filter((t) => t.status === "in_progress").length,
        total_checkins: mapped.reduce((acc, t) => acc + t.check_ins.length, 0),
      },
    },
  };
}
