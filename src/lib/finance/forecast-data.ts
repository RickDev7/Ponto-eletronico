import { requireCompanyContext } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import {
  advanceDateByFrequency,
  getMonthRange,
  monthKey,
  type ContractFrequency,
} from "@/lib/finance/utils";
import {
  resolveContractStatus,
  type ContractListRow,
} from "@/lib/finance/contracts-data";
import { balanceCents, resolveDisplayStatus, type InvoiceListRow } from "@/lib/finance/invoices-data";

export interface ForecastDayBucket {
  date: string;
  label: string;
  contractCents: number;
  receivableCents: number;
  totalCents: number;
}

export interface FinanceForecastData {
  days30Cents: number;
  days60Cents: number;
  days90Cents: number;
  contractRecurring30Cents: number;
  contractRecurring60Cents: number;
  contractRecurring90Cents: number;
  receivables30Cents: number;
  receivables60Cents: number;
  receivables90Cents: number;
  mrrCents: number;
  monthlyBuckets: ForecastDayBucket[];
}

function addDays(isoDate: string, days: number): string {
  return new Date(new Date(isoDate).getTime() + days * 86400000).toISOString().slice(0, 10);
}

export function computeContractBillingInRange(
  contracts: ContractListRow[],
  startDate: string,
  endDate: string,
): number {
  let total = 0;
  const active = contracts.filter((c) => resolveContractStatus(c) === "active");

  for (const c of active) {
    const amount = c.total_cents ?? c.amount_cents;
    let cursor = c.next_invoice_date ?? c.start_date;

    while (cursor <= endDate) {
      if (cursor >= startDate) total += amount;
      cursor = advanceDateByFrequency(new Date(cursor), c.frequency as ContractFrequency)
        .toISOString()
        .slice(0, 10);
      if (c.end_date && cursor > c.end_date) break;
    }
  }

  return total;
}

export function computeReceivablesInRange(
  invoices: Pick<InvoiceListRow, "due_date" | "total_cents" | "amount_paid_cents" | "status">[],
  startDate: string,
  endDate: string,
): number {
  return invoices.reduce((sum, inv) => {
    const displayStatus = resolveDisplayStatus(inv.status, inv.due_date);
    if (["paid", "cancelled", "draft"].includes(displayStatus)) return sum;
    if (inv.due_date < startDate || inv.due_date > endDate) return sum;
    return sum + balanceCents(inv as InvoiceListRow);
  }, 0);
}

export function buildForecastFromData(
  contracts: ContractListRow[],
  invoices: Pick<InvoiceListRow, "due_date" | "total_cents" | "amount_paid_cents" | "status">[],
  locale: string,
): FinanceForecastData {
  const today = new Date().toISOString().slice(0, 10);
  const end30 = addDays(today, 30);
  const end60 = addDays(today, 60);
  const end90 = addDays(today, 90);

  const contractRecurring30Cents = computeContractBillingInRange(contracts, today, end30);
  const contractRecurring60Cents = computeContractBillingInRange(contracts, today, end60);
  const contractRecurring90Cents = computeContractBillingInRange(contracts, today, end90);

  const receivables30Cents = computeReceivablesInRange(invoices, today, end30);
  const receivables60Cents = computeReceivablesInRange(invoices, today, end60);
  const receivables90Cents = computeReceivablesInRange(invoices, today, end90);

  const active = contracts.filter((c) => resolveContractStatus(c) === "active");
  const mrrCents = active.reduce((s, c) => {
    const factor =
      c.frequency === "bimonthly"
        ? 0.5
        : c.frequency === "quarterly"
          ? 1 / 3
          : c.frequency === "semiannual"
            ? 1 / 6
            : c.frequency === "annual"
              ? 1 / 12
              : 1;
    return s + Math.round(c.amount_cents * factor);
  }, 0);

  const monthlyBuckets: ForecastDayBucket[] = [];
  for (let i = 0; i < 3; i++) {
    const d = new Date();
    d.setMonth(d.getMonth() + i);
    const key = monthKey(d);
    const { start, end } = getMonthRange(key);
    const rangeStart = i === 0 ? today : start;
    const contractCents = computeContractBillingInRange(contracts, rangeStart, end);
    const receivableCents = computeReceivablesInRange(invoices, rangeStart, end);
    monthlyBuckets.push({
      date: key,
      label: d.toLocaleDateString(locale, { month: "long", year: "numeric" }),
      contractCents,
      receivableCents,
      totalCents: contractCents + receivableCents,
    });
  }

  return {
    days30Cents: contractRecurring30Cents + receivables30Cents,
    days60Cents: contractRecurring60Cents + receivables60Cents,
    days90Cents: contractRecurring90Cents + receivables90Cents,
    contractRecurring30Cents,
    contractRecurring60Cents,
    contractRecurring90Cents,
    receivables30Cents,
    receivables60Cents,
    receivables90Cents,
    mrrCents,
    monthlyBuckets,
  };
}

export async function getFinanceForecastData(
  slug: string,
  locale: string,
): Promise<FinanceForecastData> {
  const ctx = await requireCompanyContext({ slug, minRole: "supervisor" });
  const supabase = await createClient();
  const companyId = ctx.company.id;

  const [{ data: contracts }, { data: invoices }] = await Promise.all([
    supabase
      .from("contracts")
      .select(
        "id, title, amount_cents, total_cents, frequency, start_date, end_date, next_invoice_date, is_active, status",
      )
      .eq("company_id", companyId),
    supabase
      .from("invoices")
      .select("due_date, total_cents, amount_paid_cents, status")
      .eq("company_id", companyId)
      .not("status", "in", '("cancelled","draft")'),
  ]);

  return buildForecastFromData(
    (contracts ?? []) as ContractListRow[],
    invoices ?? [],
    locale,
  );
}
