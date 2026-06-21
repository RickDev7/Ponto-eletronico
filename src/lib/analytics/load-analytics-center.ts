import { requireCompanyContext } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { loadFinanceAnalytics } from "@/lib/finance/load-finance-analytics";
import { monthlyAmountCents } from "@/lib/finance/contracts-data";
import { getMonthRange, monthKey } from "@/lib/finance/utils";
import { shiftDurationMinutes } from "@/lib/workforce/planning-data";
import { loadShifts } from "@/lib/workforce/load-workforce-data";
import { minutesBetween, type ShiftRow } from "@/lib/workforce/workforce-data";
import type { AnalyticsCenterData } from "@/lib/analytics/analytics-center-types";

function shiftMonth(date: Date, delta: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}

function monthLabels(locale: string, count: number): Array<{ key: string; label: string; start: string; end: string }> {
  const now = new Date();
  return Array.from({ length: count }, (_, i) => {
    const d = shiftMonth(now, -(count - 1 - i));
    const key = monthKey(d);
    const { start, end } = getMonthRange(key);
    return {
      key,
      label: d.toLocaleDateString(locale, { month: "short", year: "2-digit" }),
      start,
      end,
    };
  });
}

export async function loadAnalyticsCenter(
  slug: string,
  locale: string,
): Promise<AnalyticsCenterData> {
  const ctx = await requireCompanyContext({ slug, minRole: "supervisor" });
  const supabase = await createClient();
  const companyId = ctx.company.id;
  const now = new Date();
  const year = now.getFullYear();
  const yearStart = `${year}-01-01`;
  const months = monthLabels(locale, 6);
  const rangeStart = months[0]!.start;
  const rangeEnd = months[months.length - 1]!.end;

  const [
    finance,
    { data: contracts },
    { data: checkIns },
    { data: tasks },
    { data: invoices },
    { data: payments },
    { data: employees },
    shifts,
  ] = await Promise.all([
    loadFinanceAnalytics(slug, locale),
    supabase
      .from("contracts")
      .select("amount_cents, frequency, is_active")
      .eq("company_id", companyId)
      .eq("is_active", true),
    supabase
      .from("check_ins")
      .select("employee_id, check_in_at, check_out_at")
      .eq("company_id", companyId)
      .gte("check_in_at", `${rangeStart}T00:00:00`)
      .lte("check_in_at", `${rangeEnd}T23:59:59`)
      .not("check_out_at", "is", null),
    supabase
      .from("tasks")
      .select("id, status, scheduled_date, completed_at")
      .eq("company_id", companyId)
      .gte("scheduled_date", rangeStart)
      .lte("scheduled_date", rangeEnd)
      .neq("status", "cancelled"),
    supabase
      .from("invoices")
      .select("id, due_date, status, amount_paid_cents, total_cents, issue_date")
      .eq("company_id", companyId)
      .gte("issue_date", yearStart),
    supabase
      .from("payments")
      .select("invoice_id, payment_date, amount_cents")
      .eq("company_id", companyId)
      .gte("payment_date", yearStart),
    supabase
      .from("employees")
      .select("id, full_name, status")
      .eq("company_id", companyId)
      .eq("status", "active"),
    loadShifts(companyId, rangeStart, rangeEnd),
  ]);

  const mrrCents = (contracts ?? [])
    .filter((c) => c.is_active)
    .reduce((s, c) => s + monthlyAmountCents(c as { amount_cents: number; frequency: string }), 0);

  const utilizationMonthly = months.map((m) => {
    const monthShifts = (shifts as ShiftRow[]).filter(
      (s) => s.scheduledDate >= m.start && s.scheduledDate <= m.end,
    );
    const plannedMinutes = monthShifts.reduce((a, s) => a + shiftDurationMinutes(s), 0);
    const workedMinutes = (checkIns ?? [])
      .filter((ci) => {
        const d = (ci.check_in_at as string).slice(0, 10);
        return d >= m.start && d <= m.end;
      })
      .reduce(
        (a, ci) => a + minutesBetween(ci.check_in_at as string, ci.check_out_at as string),
        0,
      );
    const pct = plannedMinutes > 0 ? Math.round((workedMinutes / plannedMinutes) * 100) : 0;
    return { key: m.key, label: m.label, plannedMinutes, workedMinutes, pct };
  });

  const totalPlanned = utilizationMonthly.reduce((s, m) => s + m.plannedMinutes, 0);
  const totalWorked = utilizationMonthly.reduce((s, m) => s + m.workedMinutes, 0);

  const revenueMonthly = months.map((m) => {
    const receivedCents = (payments ?? [])
      .filter((p) => (p.payment_date as string) >= m.start && (p.payment_date as string) <= m.end)
      .reduce((s, p) => s + (p.amount_cents ?? 0), 0);
    const invoicedCents = (invoices ?? [])
      .filter(
        (i) =>
          (i.issue_date as string) >= m.start &&
          (i.issue_date as string) <= m.end &&
          !["draft", "cancelled"].includes(i.status as string),
      )
      .reduce((s, i) => s + (i.total_cents ?? 0), 0);
    return { key: m.key, label: m.label, receivedCents, invoicedCents };
  });

  const taskList = tasks ?? [];
  const today = now.toISOString().slice(0, 10);
  const completed = taskList.filter((t) => t.status === "completed" && t.completed_at);
  const onTime = completed.filter((t) => {
    const done = (t.completed_at as string).slice(0, 10);
    return done <= (t.scheduled_date as string);
  });
  const late = completed.filter((t) => {
    const done = (t.completed_at as string).slice(0, 10);
    return done > (t.scheduled_date as string);
  });
  const overdueOpen = taskList.filter(
    (t) =>
      (t.scheduled_date as string) < today &&
      t.status !== "completed" &&
      t.status !== "cancelled",
  ).length;

  const slaMonthly = months.map((m) => {
    const monthTasks = taskList.filter(
      (t) => (t.scheduled_date as string) >= m.start && (t.scheduled_date as string) <= m.end,
    );
    const monthCompleted = monthTasks.filter((t) => t.status === "completed" && t.completed_at);
    const monthOnTime = monthCompleted.filter((t) => {
      const done = (t.completed_at as string).slice(0, 10);
      return done <= (t.scheduled_date as string);
    });
    const compliancePct =
      monthCompleted.length > 0
        ? Math.round((monthOnTime.length / monthCompleted.length) * 100)
        : 100;
    return { key: m.key, label: m.label, compliancePct };
  });

  const paidInvoices = (invoices ?? []).filter((i) => (i.amount_paid_cents ?? 0) > 0);
  const paymentsByInvoice = new Map<string, string>();
  for (const p of payments ?? []) {
    const existing = paymentsByInvoice.get(p.invoice_id as string);
    const date = p.payment_date as string;
    if (!existing || date < existing) paymentsByInvoice.set(p.invoice_id as string, date);
  }
  let invoicesPaidOnTime = 0;
  let invoicesPaidLate = 0;
  for (const inv of paidInvoices) {
    const firstPayment = paymentsByInvoice.get(inv.id as string);
    if (!firstPayment) continue;
    if (firstPayment <= (inv.due_date as string)) invoicesPaidOnTime++;
    else invoicesPaidLate++;
  }
  const invoiceCollectionPct =
    invoicesPaidOnTime + invoicesPaidLate > 0
      ? Math.round((invoicesPaidOnTime / (invoicesPaidOnTime + invoicesPaidLate)) * 100)
      : 100;

  const completedIds = new Set(completed.map((t) => t.id as string));
  const { data: assignmentRows } = await supabase
    .from("task_assignments")
    .select("employee_id, task_id")
    .eq("company_id", companyId);

  const employeeStats = new Map<
    string,
    { name: string; completed: number; minutes: number; planned: number }
  >();
  for (const emp of employees ?? []) {
    employeeStats.set(emp.id as string, {
      name: emp.full_name as string,
      completed: 0,
      minutes: 0,
      planned: 0,
    });
  }

  for (const ci of checkIns ?? []) {
    const eid = ci.employee_id as string;
    const entry = employeeStats.get(eid);
    if (!entry) continue;
    entry.minutes += minutesBetween(ci.check_in_at as string, ci.check_out_at as string);
  }

  for (const shift of shifts as ShiftRow[]) {
    const entry = employeeStats.get(shift.employeeId);
    if (entry) entry.planned += shiftDurationMinutes(shift);
  }

  for (const row of assignmentRows ?? []) {
    if (!completedIds.has(row.task_id as string)) continue;
    const eid = row.employee_id as string;
    const entry = employeeStats.get(eid);
    if (entry) entry.completed += 1;
  }

  const topPerformers = [...employeeStats.entries()]
    .map(([id, v]) => ({
      id,
      name: v.name,
      completedTasks: v.completed,
      hoursWorked: Math.round(v.minutes / 60),
      utilizationPct: v.planned > 0 ? Math.round((v.minutes / v.planned) * 100) : 0,
    }))
    .filter((r) => r.completedTasks > 0 || r.hoursWorked > 0)
    .sort((a, b) => b.completedTasks - a.completedTasks || b.hoursWorked - a.hoursWorked)
    .slice(0, 8);

  const totalCompleted = topPerformers.reduce((s, p) => s + p.completedTasks, 0);
  const productivityPct =
    totalPlanned > 0 ? Math.round((totalWorked / totalPlanned) * 100) : 0;

  return {
    utilization: {
      pct: totalPlanned > 0 ? Math.round((totalWorked / totalPlanned) * 100) : 0,
      plannedMinutes: totalPlanned,
      workedMinutes: totalWorked,
      employeeCount: employees?.length ?? 0,
      monthly: utilizationMonthly,
    },
    revenue: {
      receivedYtdCents: finance.summary.receivedCents,
      invoicedYtdCents: finance.summary.invoicedCents,
      mrrCents,
      monthly: revenueMonthly,
    },
    profitability: {
      grossMarginPct: finance.summary.grossMarginPct,
      grossProfitCents: finance.summary.grossProfitCents,
      revenueCents: finance.summary.revenueCents,
      costCents: finance.summary.costCents,
      topClients: finance.byClient.slice(0, 5).map((r) => ({
        id: r.id,
        name: r.name,
        revenueCents: r.receivedCents,
        marginPct: r.marginPct,
      })),
      topServices: finance.byService.slice(0, 5).map((r) => ({
        id: r.id,
        name: r.name,
        revenueCents: r.revenueCents,
        marginPct: r.marginPct,
      })),
    },
    sla: {
      compliancePct:
        completed.length > 0 ? Math.round((onTime.length / completed.length) * 100) : 100,
      onTimeCount: onTime.length,
      lateCount: late.length,
      overdueOpenCount: overdueOpen,
      invoiceCollectionPct,
      invoicesPaidOnTime,
      invoicesPaidLate,
      monthly: slaMonthly,
    },
    workforce: {
      activeEmployees: employees?.length ?? 0,
      productivityPct,
      completedTasks: completed.length,
      totalHoursWorked: Math.round(totalWorked / 60),
      topPerformers,
    },
    yearStart,
  };
}
