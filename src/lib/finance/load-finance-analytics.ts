import { requireCompanyContext } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { monthlyAmountCents, type ContractListRow } from "@/lib/finance/contracts-data";
import { getMonthRange, monthKey } from "@/lib/finance/utils";
import { DEFAULT_LABOR_RATE_CENTS } from "@/lib/workforce/planning-profitability-types";
import { minutesBetween } from "@/lib/workforce/workforce-data";
import {
  buildCostCategories,
  computeMargin,
  rankAnalytics,
  type AnalyticsMonthBucket,
  type FinanceAnalyticsData,
} from "@/lib/finance/analytics-types";

function shiftMonth(date: Date, delta: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}

export async function loadFinanceAnalytics(
  slug: string,
  locale: string,
): Promise<FinanceAnalyticsData> {
  const ctx = await requireCompanyContext({ slug, minRole: "supervisor" });
  const supabase = await createClient();
  const companyId = ctx.company.id;
  const now = new Date();
  const year = now.getFullYear();
  const yearStart = `${year}-01-01`;
  const rangeStart = getMonthRange(monthKey(shiftMonth(now, -11))).start;

  const [
    { data: payments },
    { data: invoices },
    { data: invoiceItems },
    { data: contracts },
    { data: materialPurchases },
    { data: materialConsumption },
    { data: materials },
    { data: equipmentMaintenance },
    { data: vehicleMaintenance },
    { data: financeExpenses },
    { data: checkIns },
    { data: services },
    { data: tasks },
  ] = await Promise.all([
    supabase
      .from("payments")
      .select("amount_cents, payment_date")
      .eq("company_id", companyId)
      .gte("payment_date", rangeStart),
    supabase
      .from("invoices")
      .select("id, client_id, client_name, total_cents, amount_paid_cents, tax_cents, status, issue_date")
      .eq("company_id", companyId)
      .gte("issue_date", yearStart)
      .not("status", "in", '("cancelled","draft")'),
    supabase
      .from("invoice_items")
      .select("description, line_total_cents, service_id, invoice:invoices!inner(company_id, status, issue_date, amount_paid_cents, total_cents, client_id, client_name)")
      .eq("company_id", companyId),
    supabase
      .from("contracts")
      .select("id, amount_cents, discount_cents, is_active, frequency")
      .eq("company_id", companyId),
    supabase
      .from("material_purchases")
      .select("total_cost_cents, purchased_at")
      .eq("company_id", companyId)
      .gte("purchased_at", rangeStart),
    supabase
      .from("material_consumption")
      .select("quantity, material_id, consumed_at, service_id")
      .eq("company_id", companyId)
      .gte("consumed_at", `${rangeStart}T00:00:00`),
    supabase
      .from("materials")
      .select("id, unit_cost_cents")
      .eq("company_id", companyId),
    supabase
      .from("equipment_maintenance")
      .select("cost_cents, completed_at")
      .eq("company_id", companyId)
      .eq("status", "completed")
      .gte("completed_at", `${rangeStart}T00:00:00`),
    supabase
      .from("vehicle_maintenance")
      .select("cost_cents, completed_at")
      .eq("company_id", companyId)
      .eq("status", "completed")
      .gte("completed_at", `${rangeStart}T00:00:00`),
    supabase
      .from("finance_expenses")
      .select("amount_cents, expense_date, category")
      .eq("company_id", companyId)
      .gte("expense_date", rangeStart),
    supabase
      .from("check_ins")
      .select("check_in_at, check_out_at, employee_id, task:tasks(service_id, client_id)")
      .eq("company_id", companyId)
      .gte("check_in_at", `${rangeStart}T00:00:00`)
      .not("check_out_at", "is", null),
    supabase.from("services").select("id, name").eq("company_id", companyId),
    supabase
      .from("tasks")
      .select("id, service_id, client_id, scheduled_date")
      .eq("company_id", companyId)
      .gte("scheduled_date", yearStart)
      .not("status", "eq", "cancelled"),
  ]);

  const serviceNames = new Map((services ?? []).map((s) => [s.id as string, s.name as string]));
  const materialCosts = new Map(
    (materials ?? []).map((m) => [m.id as string, Number(m.unit_cost_cents ?? 0)]),
  );

  const monthMap = new Map<string, AnalyticsMonthBucket>();
  const initMonth = (key: string, label: string): AnalyticsMonthBucket => ({
    key,
    label,
    revenueCents: 0,
    receivedCents: 0,
    costCents: 0,
    profitCents: 0,
    marginPct: 0,
    inflowCents: 0,
    outflowCents: 0,
    netCashflowCents: 0,
  });

  for (let i = 11; i >= 0; i--) {
    const d = shiftMonth(now, -i);
    const key = monthKey(d);
    const label = d.toLocaleDateString(locale, { month: "short", year: "2-digit" });
    monthMap.set(key, initMonth(key, label));
  }

  const clients = new Map<string, { name: string; revenue: number; received: number; cost: number; count: number }>();
  const serviceMap = new Map<string, { name: string; revenue: number; received: number; cost: number; count: number }>();

  let totalInvoiced = 0;
  let totalReceived = 0;
  let totalLabor = 0;
  let totalMaterials = 0;
  let totalMaintenance = 0;
  let totalTax = 0;
  let totalExpenses = 0;
  let totalDiscounts = 0;

  for (const p of payments ?? []) {
    const key = (p.payment_date as string).slice(0, 7);
    const bucket = monthMap.get(key);
    if (bucket) {
      bucket.receivedCents += p.amount_cents ?? 0;
      bucket.inflowCents += p.amount_cents ?? 0;
    }
    totalReceived += p.amount_cents ?? 0;
  }

  for (const inv of invoices ?? []) {
    totalInvoiced += inv.total_cents ?? 0;
    const key = (inv.issue_date as string).slice(0, 7);
    const bucket = monthMap.get(key);
    const tax = inv.tax_cents ?? 0;
    totalTax += tax;
    if (bucket) {
      bucket.revenueCents += inv.total_cents ?? 0;
      bucket.costCents += tax;
      bucket.outflowCents += tax;
    }

    const clientKey = (inv.client_id as string) ?? (inv.client_name as string);
    const clientEntry = clients.get(clientKey) ?? {
      name: (inv.client_name as string) ?? "—",
      revenue: 0,
      received: 0,
      cost: 0,
      count: 0,
    };
    clientEntry.revenue += inv.total_cents ?? 0;
    clientEntry.received += inv.amount_paid_cents ?? 0;
    clientEntry.count += 1;
    clients.set(clientKey, clientEntry);
  }

  for (const item of invoiceItems ?? []) {
    const inv = Array.isArray(item.invoice) ? item.invoice[0] : item.invoice;
    if (!inv) continue;
    const invRow = inv as {
      status?: string;
      issue_date?: string;
      amount_paid_cents?: number;
      total_cents?: number;
      client_id?: string;
      client_name?: string;
    };
    if (invRow.status === "cancelled" || invRow.status === "draft") continue;
    if (invRow.issue_date && invRow.issue_date < yearStart) continue;

    const serviceId = (item.service_id as string | null) ?? `desc:${(item.description as string).trim() || "other"}`;
    const serviceName =
      item.service_id && serviceNames.get(item.service_id as string)
        ? serviceNames.get(item.service_id as string)!
        : (item.description as string).trim() || "Other";

    const sEntry = serviceMap.get(serviceId) ?? {
      name: serviceName,
      revenue: 0,
      received: 0,
      cost: 0,
      count: 0,
    };
    sEntry.revenue += item.line_total_cents ?? 0;
    const paidShare =
      invRow.total_cents && invRow.total_cents > 0
        ? Math.round(((item.line_total_cents ?? 0) * (invRow.amount_paid_cents ?? 0)) / invRow.total_cents)
        : 0;
    sEntry.received += paidShare;
    sEntry.count += 1;
    serviceMap.set(serviceId, sEntry);
  }

  for (const c of contracts ?? []) {
    totalDiscounts += c.discount_cents ?? 0;
  }

  const addOutflow = (dateIso: string, cents: number, category: "materials" | "maintenance" | "expenses" | "labor") => {
    const key = dateIso.slice(0, 7);
    const bucket = monthMap.get(key);
    if (bucket) {
      bucket.costCents += cents;
      bucket.outflowCents += cents;
    }
    if (category === "materials") totalMaterials += cents;
    else if (category === "maintenance") totalMaintenance += cents;
    else if (category === "expenses") totalExpenses += cents;
    else totalLabor += cents;
  };

  for (const mp of materialPurchases ?? []) {
    addOutflow(mp.purchased_at as string, mp.total_cost_cents ?? 0, "materials");
  }

  for (const mc of materialConsumption ?? []) {
    const unitCost = materialCosts.get(mc.material_id as string) ?? 0;
    const cents = Math.round(Number(mc.quantity) * unitCost);
    addOutflow((mc.consumed_at as string).slice(0, 10), cents, "materials");

    if (mc.service_id) {
      const sid = mc.service_id as string;
      const sEntry = serviceMap.get(sid) ?? {
        name: serviceNames.get(sid) ?? "—",
        revenue: 0,
        received: 0,
        cost: 0,
        count: 0,
      };
      sEntry.cost += cents;
      serviceMap.set(sid, sEntry);
    }
  }

  for (const em of equipmentMaintenance ?? []) {
    addOutflow((em.completed_at as string).slice(0, 10), em.cost_cents ?? 0, "maintenance");
  }

  for (const vm of vehicleMaintenance ?? []) {
    addOutflow((vm.completed_at as string).slice(0, 10), vm.cost_cents ?? 0, "maintenance");
  }

  for (const ex of financeExpenses ?? []) {
    addOutflow(ex.expense_date as string, ex.amount_cents ?? 0, "expenses");
  }

  for (const ci of checkIns ?? []) {
    if (!ci.check_out_at) continue;
    const minutes = minutesBetween(ci.check_in_at as string, ci.check_out_at as string);
    const laborCents = Math.round((minutes / 60) * DEFAULT_LABOR_RATE_CENTS);
    addOutflow((ci.check_in_at as string).slice(0, 10), laborCents, "labor");

    const task = Array.isArray(ci.task) ? ci.task[0] : ci.task;
    const clientId = (task as { client_id?: string } | null)?.client_id;
    if (clientId) {
      const entry = clients.get(clientId);
      if (entry) entry.cost += laborCents;
    }
    const serviceId = (task as { service_id?: string } | null)?.service_id;
    if (serviceId) {
      const sEntry = serviceMap.get(serviceId) ?? {
        name: serviceNames.get(serviceId) ?? "—",
        revenue: 0,
        received: 0,
        cost: 0,
        count: 0,
      };
      sEntry.cost += laborCents;
      serviceMap.set(serviceId, sEntry);
    }
  }

  let runningNet = 0;
  const monthly = [...monthMap.values()].map((bucket) => {
    const { marginCents, marginPct: pct } = computeMargin(bucket.revenueCents, bucket.costCents);
    runningNet += bucket.inflowCents - bucket.outflowCents;
    return {
      ...bucket,
      profitCents: marginCents,
      marginPct: pct,
      netCashflowCents: runningNet,
    };
  });

  const totalCost =
    totalLabor + totalMaterials + totalMaintenance + totalTax + totalExpenses + totalDiscounts;
  const { marginCents: grossProfit, marginPct: grossMarginPct } = computeMargin(
    totalInvoiced,
    totalCost,
  );

  const activeContracts = (contracts ?? []).filter((c) => c.is_active) as ContractListRow[];
  const mrrCents = activeContracts.reduce((s, c) => s + monthlyAmountCents(c), 0);

  return {
    summary: {
      revenueCents: totalInvoiced,
      receivedCents: totalReceived,
      invoicedCents: totalInvoiced,
      costCents: totalCost,
      grossProfitCents: grossProfit,
      grossMarginPct,
      netCashflowCents: runningNet,
      mrrCents,
    },
    monthly,
    byClient: rankAnalytics(clients),
    byService: rankAnalytics(serviceMap),
    costCategories: buildCostCategories({
      labor: totalLabor,
      materials: totalMaterials,
      maintenance: totalMaintenance,
      tax: totalTax,
      expenses: totalExpenses,
      discounts: totalDiscounts,
    }),
    yearStart,
  };
}
