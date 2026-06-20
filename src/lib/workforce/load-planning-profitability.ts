import "server-only";

import { createClient } from "@/lib/supabase/server";
import { shiftDurationMinutes } from "@/lib/workforce/planning-data";
import {
  DEFAULT_LABOR_RATE_CENTS,
  marginPct,
  type PlanningProfitability,
  type PlanningProfitRow,
} from "@/lib/workforce/planning-profitability-types";
import type { ShiftRow, WorkforceEmployeeRow } from "@/lib/workforce/workforce-data";

export async function loadPlanningProfitability(
  companyId: string,
  from: string,
  to: string,
  shifts: ShiftRow[],
  employees: WorkforceEmployeeRow[],
): Promise<PlanningProfitability> {
  const supabase = await createClient();

  const { data: invoices } = await supabase
    .from("invoices")
    .select("client_id, client_name, amount_paid_cents, total_cents, issue_date")
    .eq("company_id", companyId)
    .gte("issue_date", from)
    .lte("issue_date", to)
    .not("status", "in", '("cancelled","draft")');

  const clientRevenue = new Map<string, { name: string; cents: number }>();
  for (const inv of invoices ?? []) {
    const key = (inv.client_id as string | null) ?? (inv.client_name as string);
    const entry = clientRevenue.get(key) ?? {
      name: (inv.client_name as string) ?? "—",
      cents: 0,
    };
    entry.cents += inv.amount_paid_cents ?? 0;
    clientRevenue.set(key, entry);
  }

  const clientShiftCounts = new Map<string, number>();
  const clientLabor = new Map<string, number>();
  const employeeLabor = new Map<string, { name: string; minutes: number; shifts: number }>();

  for (const shift of shifts) {
    const minutes = shiftDurationMinutes(shift);
    const laborCents = Math.round((minutes / 60) * DEFAULT_LABOR_RATE_CENTS);

    const empEntry = employeeLabor.get(shift.employeeId) ?? {
      name: shift.employeeName,
      minutes: 0,
      shifts: 0,
    };
    empEntry.minutes += minutes;
    empEntry.shifts += 1;
    employeeLabor.set(shift.employeeId, empEntry);

    const clientKey = shift.clientId ?? shift.clientName;
    if (clientKey && clientKey !== "—") {
      clientShiftCounts.set(clientKey, (clientShiftCounts.get(clientKey) ?? 0) + 1);
      clientLabor.set(clientKey, (clientLabor.get(clientKey) ?? 0) + laborCents);
    }
  }

  const totalClientShifts = [...clientShiftCounts.values()].reduce((a, b) => a + b, 0);

  const byClient: PlanningProfitRow[] = [...clientRevenue.entries()]
    .map(([id, rev]) => {
      const shiftsForClient = clientShiftCounts.get(id) ?? 0;
      const share =
        totalClientShifts > 0 && shiftsForClient > 0
          ? Math.round((rev.cents * shiftsForClient) / totalClientShifts)
          : rev.cents;
      const labor = clientLabor.get(id) ?? 0;
      const margin = share - labor;
      return {
        id,
        name: rev.name,
        revenueCents: share,
        laborCostCents: labor,
        marginCents: margin,
        marginPct: marginPct(share, labor),
        shiftCount: shiftsForClient,
      };
    })
    .sort((a, b) => b.marginCents - a.marginCents)
    .slice(0, 10);

  const byEmployee: PlanningProfitRow[] = employees
    .map((emp) => {
      const data = employeeLabor.get(emp.id);
      const labor = data ? Math.round((data.minutes / 60) * DEFAULT_LABOR_RATE_CENTS) : 0;
      const revenueShare = byClient.reduce((a, c) => a + c.revenueCents, 0);
      const empShare =
        shifts.length > 0 && data
          ? Math.round((revenueShare * data.shifts) / shifts.length)
          : 0;
      const margin = empShare - labor;
      return {
        id: emp.id,
        name: emp.full_name,
        revenueCents: empShare,
        laborCostCents: labor,
        marginCents: margin,
        marginPct: marginPct(empShare, labor),
        shiftCount: data?.shifts ?? 0,
      };
    })
    .filter((r) => r.shiftCount > 0)
    .sort((a, b) => b.marginCents - a.marginCents)
    .slice(0, 10);

  const totalRevenueCents = byClient.reduce((a, r) => a + r.revenueCents, 0);
  const totalLaborCents = byEmployee.reduce((a, r) => a + r.laborCostCents, 0);

  return {
    byEmployee,
    byClient,
    totalRevenueCents,
    totalLaborCents,
    totalMarginCents: totalRevenueCents - totalLaborCents,
  };
}
