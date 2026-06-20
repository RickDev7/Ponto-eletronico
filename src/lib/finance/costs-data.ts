import { requireCompanyContext } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { getMonthRange, monthKey } from "@/lib/finance/utils";
import { resolveDisplayStatus } from "@/lib/finance/invoices-data";

export interface CostsMonthBucket {
  key: string;
  label: string;
  taxCents: number;
  discountCents: number;
}

export interface FinanceCostsData {
  taxPayableCents: number;
  discountsCents: number;
  unbilledExecutionsCount: number;
  unbilledExecutionsCents: number;
  operationalMinutes: number;
  billedExecutionsCount: number;
  approvedExecutionsCount: number;
  monthlyBuckets: CostsMonthBucket[];
}

export async function getFinanceCostsData(
  slug: string,
  locale: string,
): Promise<FinanceCostsData> {
  const ctx = await requireCompanyContext({ slug, minRole: "supervisor" });
  const supabase = await createClient();
  const companyId = ctx.company.id;
  const year = new Date().getFullYear();
  const yearStart = `${year}-01-01`;

  const [{ data: invoices }, { data: contracts }, { data: tasks }, { data: services }] =
    await Promise.all([
      supabase
        .from("invoices")
        .select("tax_cents, subtotal_cents, total_cents, issue_date, status, due_date, amount_paid_cents")
        .eq("company_id", companyId)
        .gte("issue_date", yearStart)
        .not("status", "in", '("cancelled","draft")'),
      supabase
        .from("contracts")
        .select("id, amount_cents, discount_cents")
        .eq("company_id", companyId),
      supabase
        .from("tasks")
        .select("id, approved_at, invoice_id, contract_id, service_id, status")
        .eq("company_id", companyId)
        .gte("scheduled_date", yearStart)
        .not("status", "eq", "cancelled"),
      supabase
        .from("services")
        .select("id, estimated_duration_minutes")
        .eq("company_id", companyId),
    ]);

  const serviceDuration = new Map(
    (services ?? []).map((s) => [s.id, s.estimated_duration_minutes ?? 60]),
  );
  const contractAmount = new Map(
    (contracts ?? []).map((c) => [c.id, c.amount_cents ?? 0]),
  );

  let taxPayableCents = 0;
  let discountsCents = 0;
  const monthlyMap = new Map<string, CostsMonthBucket>();

  for (const inv of invoices ?? []) {
    const displayStatus = resolveDisplayStatus(inv.status, inv.due_date ?? inv.issue_date);
    if (displayStatus === "cancelled" || displayStatus === "draft") continue;

    taxPayableCents += inv.tax_cents ?? 0;

    const key = inv.issue_date.slice(0, 7);
    const bucket = monthlyMap.get(key) ?? {
      key,
      label: new Date(`${key}-01`).toLocaleDateString(locale, { month: "short", year: "2-digit" }),
      taxCents: 0,
      discountCents: 0,
    };
    bucket.taxCents += inv.tax_cents ?? 0;
    monthlyMap.set(key, bucket);
  }

  for (const c of contracts ?? []) {
    discountsCents += c.discount_cents ?? 0;
  }

  let unbilledExecutionsCount = 0;
  let unbilledExecutionsCents = 0;
  let operationalMinutes = 0;
  let billedExecutionsCount = 0;
  let approvedExecutionsCount = 0;
  const unbilledContracts = new Set<string>();

  for (const task of tasks ?? []) {
    const duration = task.service_id
      ? serviceDuration.get(task.service_id) ?? 60
      : 60;

    if (task.approved_at) {
      approvedExecutionsCount += 1;
      operationalMinutes += duration;
    }

    if (task.invoice_id) {
      billedExecutionsCount += 1;
    } else if (task.approved_at && task.contract_id) {
      unbilledExecutionsCount += 1;
      unbilledContracts.add(task.contract_id);
    }
  }

  for (const contractId of unbilledContracts) {
    unbilledExecutionsCents += contractAmount.get(contractId) ?? 0;
  }

  const monthlyBuckets = Array.from({ length: 12 }, (_, i) => {
    const key = `${year}-${String(i + 1).padStart(2, "0")}`;
    const { start } = getMonthRange(key);
    const existing = monthlyMap.get(key);
    if (existing) return existing;
    return {
      key,
      label: new Date(start).toLocaleDateString(locale, { month: "short", year: "2-digit" }),
      taxCents: 0,
      discountCents: 0,
    };
  });

  return {
    taxPayableCents,
    discountsCents,
    unbilledExecutionsCount,
    unbilledExecutionsCents,
    operationalMinutes,
    billedExecutionsCount,
    approvedExecutionsCount,
    monthlyBuckets,
  };
}
