import { advanceDateByFrequency, type ContractFrequency } from "@/lib/finance/utils";
import type { CreateContractInput } from "@/lib/validations/finance";

export type ContractStatus =
  | "active"
  | "pending"
  | "suspended"
  | "expired"
  | "cancelled"
  | "renewing";

export interface ContractListRow {
  id: string;
  contract_number: string | null;
  client_id: string;
  address_id?: string | null;
  title: string;
  service_description: string | null;
  amount_cents: number;
  frequency: string;
  start_date: string;
  end_date: string | null;
  next_invoice_date: string | null;
  is_active: boolean;
  status: string | null;
  tax_rate: number;
  discount_cents: number;
  subtotal_cents: number | null;
  tax_cents: number | null;
  total_cents: number | null;
  auto_renew: boolean;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  client: { name: string; contact_name?: string | null; email?: string | null } | Array<{ name: string }> | null;
  notes?: string | null;
  client_company?: string | null;
  client_email?: string | null;
  client_phone?: string | null;
  client_address?: string | null;
  auto_generate_invoice?: boolean;
  auto_send_email?: boolean;
  auto_generate_pdf?: boolean;
  payment_reminder?: boolean;
  renewal_notice_days?: number;
  items?: Array<{
    description: string;
    quantity: number;
    unit_price_cents: number;
    line_total_cents: number;
  }>;
}

export interface ContractsKpis {
  activeCount: number;
  mrrCents: number;
  arrCents: number;
  upcomingRenewals: number;
  expiringCount: number;
  forecast12mCents: number;
}

const MONTHLY_FACTOR: Record<ContractFrequency, number> = {
  monthly: 1,
  bimonthly: 0.5,
  quarterly: 1 / 3,
  semiannual: 1 / 6,
  annual: 1 / 12,
};

export function monthlyAmountCents(row: Pick<ContractListRow, "amount_cents" | "frequency">): number {
  const factor = MONTHLY_FACTOR[row.frequency as ContractFrequency] ?? 1;
  return Math.round(row.amount_cents * factor);
}

export function resolveContractStatus(row: ContractListRow): ContractStatus {
  const today = new Date().toISOString().slice(0, 10);
  if (row.status && row.status !== "active") {
    if (row.status === "pending" || row.status === "suspended" || row.status === "cancelled" || row.status === "renewing") {
      return row.status;
    }
  }
  if (row.end_date && row.end_date < today) return "expired";
  if (!row.is_active) return "suspended";
  if (row.status === "renewing") return "renewing";
  return "active";
}

export function clientName(row: ContractListRow): string {
  const c = row.client;
  if (!c) return "—";
  return Array.isArray(c) ? c[0]?.name ?? "—" : c.name;
}

export function computeContractsKpis(contracts: ContractListRow[]): ContractsKpis {
  const today = new Date().toISOString().slice(0, 10);
  const in30 = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
  const in12m = new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10);

  const active = contracts.filter((c) => resolveContractStatus(c) === "active");

  const mrrCents = active.reduce((s, c) => s + monthlyAmountCents(c), 0);
  const arrCents = mrrCents * 12;

  const upcomingRenewals = active.filter(
    (c) => c.end_date && c.end_date >= today && c.end_date <= in30 && c.auto_renew,
  ).length;

  const expiringCount = contracts.filter(
    (c) => c.end_date && c.end_date >= today && c.end_date <= in30,
  ).length;

  let forecast12mCents = 0;
  for (const c of active) {
    let cursor = c.next_invoice_date ?? c.start_date;
    const amount = c.total_cents ?? c.amount_cents;
    while (cursor <= in12m) {
      if (cursor >= today) forecast12mCents += amount;
      cursor = advanceDateByFrequency(new Date(cursor), c.frequency as ContractFrequency)
        .toISOString()
        .slice(0, 10);
      if (c.end_date && cursor > c.end_date) break;
    }
  }

  return {
    activeCount: active.length,
    mrrCents,
    arrCents,
    upcomingRenewals,
    expiringCount,
    forecast12mCents,
  };
}

export interface ForecastMonth {
  key: string;
  label: string;
  cents: number;
}

export function computeContractForecast(
  contract: ContractListRow,
  locale: string,
  months = 12,
): ForecastMonth[] {
  const result: ForecastMonth[] = [];
  const amount = contract.total_cents ?? contract.amount_cents;
  let cursor = new Date(contract.next_invoice_date ?? contract.start_date);

  for (let i = 0; i < months; i++) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;
    const label = cursor.toLocaleDateString(locale, { month: "short", year: "numeric" });
    const existing = result.find((r) => r.key === key);
    if (existing) existing.cents += amount;
    else result.push({ key, label, cents: amount });

    cursor = advanceDateByFrequency(cursor, contract.frequency as ContractFrequency);
    if (contract.end_date && cursor.toISOString().slice(0, 10) > contract.end_date) break;
  }

  return result;
}

export function contractToFormInput(contract: ContractListRow): CreateContractInput {
  const c = contract.client;
  const clientRow = Array.isArray(c) ? c[0] : c;
  return {
    clientId: contract.client_id,
    addressId: contract.address_id ?? null,
    clientName: clientRow?.name ?? "",
    clientCompany: contract.client_company ?? clientRow?.contact_name ?? "",
    clientEmail: contract.client_email ?? clientRow?.email ?? "",
    clientPhone: contract.client_phone ?? clientRow?.phone ?? "",
    clientAddress: contract.client_address ?? "",
    title: contract.title,
    serviceDescription: contract.service_description ?? "",
    items:
      contract.items?.map((i) => ({
        description: i.description,
        quantity: Number(i.quantity),
        unitPriceCents: i.unit_price_cents,
      })) ?? [{ description: contract.title, quantity: 1, unitPriceCents: contract.amount_cents }],
    frequency: contract.frequency as CreateContractInput["frequency"],
    startDate: contract.start_date,
    endDate: contract.end_date ?? "",
    taxRate: Number(contract.tax_rate),
    discountCents: contract.discount_cents ?? 0,
    notes: contract.notes ?? "",
    autoRenew: contract.auto_renew,
    renewalNoticeDays: contract.renewal_notice_days ?? 30,
    autoGenerateInvoice: contract.auto_generate_invoice ?? true,
    autoSendEmail: contract.auto_send_email ?? false,
    autoGeneratePdf: contract.auto_generate_pdf ?? true,
    paymentReminder: contract.payment_reminder ?? true,
    assignedTo: contract.assigned_to,
    isActive: contract.is_active,
    status: resolveContractStatus(contract),
  };
}
