import "server-only";

import { createClient } from "@/lib/supabase/server";
import { monthlyAmountCents } from "@/lib/finance/contracts-data";
import type { AiCompanyContext, AiDomain } from "@/lib/ai/types";

function weekBounds(): { start: string; end: string } {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((day + 6) % 7));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return {
    start: monday.toISOString().slice(0, 10),
    end: sunday.toISOString().slice(0, 10),
  };
}

export async function gatherAiContext(
  companyId: string,
  companyName: string,
  domain: AiDomain,
  locale: string,
): Promise<AiCompanyContext> {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const yearStart = `${new Date().getFullYear()}-01-01`;
  const { start: weekStart, end: weekEnd } = weekBounds();

  const [
    { data: tasks },
    { data: employees },
    { data: vacations },
    { data: invoices },
    { data: payments },
    { data: contracts },
    { data: addresses },
    { data: assignments },
  ] = await Promise.all([
    supabase
      .from("tasks")
      .select("id, status, scheduled_date, completed_at")
      .eq("company_id", companyId)
      .neq("status", "cancelled")
      .gte("scheduled_date", yearStart),
    supabase
      .from("employees")
      .select("id, status")
      .eq("company_id", companyId)
      .eq("status", "active"),
    supabase
      .from("vacation_requests")
      .select("id, status, start_date, end_date")
      .eq("company_id", companyId)
      .eq("status", "approved")
      .lte("start_date", today)
      .gte("end_date", today),
    supabase
      .from("invoices")
      .select("status, total_cents, amount_paid_cents, due_date")
      .eq("company_id", companyId)
      .gte("issue_date", yearStart),
    supabase
      .from("payments")
      .select("amount_cents")
      .eq("company_id", companyId)
      .gte("payment_date", yearStart),
    supabase
      .from("contracts")
      .select("amount_cents, frequency, is_active")
      .eq("company_id", companyId)
      .eq("is_active", true),
    supabase
      .from("addresses")
      .select("id")
      .eq("company_id", companyId)
      .eq("is_active", true),
    supabase
      .from("task_assignments")
      .select("task_id, employee_id")
      .eq("company_id", companyId),
  ]);

  const taskRows = tasks ?? [];
  const assignedTaskIds = new Set((assignments ?? []).map((a) => a.task_id));
  const overdue = taskRows.filter(
    (t) =>
      t.scheduled_date < today &&
      t.status !== "completed" &&
      t.status !== "cancelled",
  ).length;
  const completed = taskRows.filter((t) => t.status === "completed").length;
  const scheduled = taskRows.filter((t) => t.status === "scheduled").length;
  const inProgress = taskRows.filter((t) => t.status === "in_progress").length;
  const unassigned = taskRows.filter(
    (t) => !assignedTaskIds.has(t.id) && t.status !== "completed",
  ).length;

  const onTimeCompleted = taskRows.filter(
    (t) =>
      t.status === "completed" &&
      t.completed_at &&
      t.completed_at.slice(0, 10) <= t.scheduled_date,
  ).length;

  const weekTasks = taskRows.filter(
    (t) => t.scheduled_date >= weekStart && t.scheduled_date <= weekEnd,
  );
  const openShifts = weekTasks.filter((t) => !assignedTaskIds.has(t.id)).length;
  const activeEmployees = employees?.length ?? 0;
  const utilizationPct =
    weekTasks.length > 0
      ? Math.round(
          (weekTasks.filter((t) => assignedTaskIds.has(t.id)).length / weekTasks.length) *
            100,
        )
      : 0;

  const invoiceRows = invoices ?? [];
  const openInvoices = invoiceRows.filter((i) =>
    ["sent", "partial", "overdue"].includes(i.status),
  ).length;
  const overdueInvoices = invoiceRows.filter((i) => i.status === "overdue").length;
  const outstandingCents = invoiceRows
    .filter((i) => ["sent", "partial", "overdue"].includes(i.status))
    .reduce((s, i) => s + Math.max(0, (i.total_cents ?? 0) - (i.amount_paid_cents ?? 0)), 0);
  const receivedYtdCents = (payments ?? []).reduce((s, p) => s + (p.amount_cents ?? 0), 0);
  const mrrCents = (contracts ?? []).reduce(
    (s, c) => s + monthlyAmountCents(c as { amount_cents: number; frequency: string }),
    0,
  );

  const visitsThisWeek = taskRows.filter(
    (t) => t.scheduled_date >= weekStart && t.scheduled_date <= weekEnd,
  ).length;

  const completionRatePct =
    taskRows.length > 0 ? Math.round((completed / taskRows.length) * 100) : 0;
  const onTimeRatePct =
    completed > 0 ? Math.round((onTimeCompleted / completed) * 100) : 0;
  const avgTasksPerEmployee =
    activeEmployees > 0
      ? Math.round((taskRows.filter((t) => t.status !== "completed").length / activeEmployees) * 10) / 10
      : 0;

  return {
    companyId,
    companyName,
    domain,
    locale,
    tasks: {
      total: taskRows.length,
      scheduled,
      inProgress,
      completed,
      overdue,
      unassigned,
    },
    workforce: {
      activeEmployees,
      openShifts,
      onVacation: vacations?.length ?? 0,
      utilizationPct,
    },
    finance: {
      openInvoices,
      overdueInvoices,
      mrrCents,
      receivedYtdCents,
      outstandingCents,
    },
    operations: {
      activeContracts: contracts?.length ?? 0,
      activeProperties: addresses?.length ?? 0,
      visitsThisWeek,
    },
    productivity: {
      completionRatePct,
      avgTasksPerEmployee,
      onTimeRatePct,
    },
  };
}

export function contextToPromptBlock(ctx: AiCompanyContext): string {
  return JSON.stringify(
    {
      company: ctx.companyName,
      domain: ctx.domain,
      tasks: ctx.tasks,
      workforce: ctx.workforce,
      finance: ctx.finance,
      operations: ctx.operations,
      productivity: ctx.productivity,
    },
    null,
    2,
  );
}
