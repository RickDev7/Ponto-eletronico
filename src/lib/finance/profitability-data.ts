import { requireCompanyContext } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";

export interface ProfitabilityRank {
  id: string;
  name: string;
  subtitle?: string;
  revenueCents: number;
  receivedCents: number;
  count: number;
}

export interface FinanceProfitabilityData {
  topClients: ProfitabilityRank[];
  topContracts: ProfitabilityRank[];
  byService: ProfitabilityRank[];
  byProperty: ProfitabilityRank[];
  totalReceivedCents: number;
  totalInvoicedCents: number;
}

function rankFromMap(
  entries: Map<string, { name: string; subtitle?: string; revenue: number; received: number; count: number }>,
  limit = 8,
): ProfitabilityRank[] {
  return [...entries.entries()]
    .map(([id, v]) => ({
      id,
      name: v.name,
      subtitle: v.subtitle,
      revenueCents: v.revenue,
      receivedCents: v.received,
      count: v.count,
    }))
    .sort((a, b) => b.receivedCents - a.receivedCents || b.revenueCents - a.revenueCents)
    .slice(0, limit);
}

export async function getFinanceProfitabilityData(
  slug: string,
): Promise<FinanceProfitabilityData> {
  const ctx = await requireCompanyContext({ slug, minRole: "supervisor" });
  const supabase = await createClient();
  const companyId = ctx.company.id;
  const yearStart = `${new Date().getFullYear()}-01-01`;

  const [{ data: invoices }, { data: contracts }, { data: invoiceItems }, { data: tasks }] =
    await Promise.all([
      supabase
        .from("invoices")
        .select("id, client_id, contract_id, client_name, total_cents, amount_paid_cents, status, issue_date")
        .eq("company_id", companyId)
        .gte("issue_date", yearStart)
        .not("status", "in", '("cancelled","draft")'),
      supabase
        .from("contracts")
        .select("id, title, amount_cents, address_id, address:addresses(id, label, street, city)")
        .eq("company_id", companyId),
      supabase
        .from("invoice_items")
        .select("description, line_total_cents, invoice:invoices!inner(company_id, status, issue_date, amount_paid_cents, total_cents)")
        .eq("company_id", companyId),
      supabase
        .from("tasks")
        .select("service_type, invoice_id, contract_id, approved_at, address:addresses(id, label, street, city)")
        .eq("company_id", companyId)
        .gte("scheduled_date", yearStart)
        .not("status", "eq", "cancelled")
        .not("approved_at", "is", null),
    ]);

  const clients = new Map<string, { name: string; revenue: number; received: number; count: number }>();
  const contractMap = new Map<string, { name: string; revenue: number; received: number; count: number }>();
  const services = new Map<string, { name: string; revenue: number; received: number; count: number }>();
  const properties = new Map<string, { name: string; revenue: number; received: number; count: number }>();

  const contractMeta = new Map(
    (contracts ?? []).map((c) => {
      const addr = Array.isArray(c.address) ? c.address[0] : c.address;
      const addrLabel = addr
        ? `${(addr as { label?: string; street?: string }).label ?? (addr as { street?: string }).street}, ${(addr as { city?: string }).city}`
        : undefined;
      return [
        c.id,
        { title: c.title, addressId: c.address_id as string | null, addressLabel: addrLabel },
      ];
    }),
  );

  let totalInvoicedCents = 0;
  let totalReceivedCents = 0;

  for (const inv of invoices ?? []) {
    totalInvoicedCents += inv.total_cents ?? 0;
    totalReceivedCents += inv.amount_paid_cents ?? 0;

    const clientKey = inv.client_id ?? inv.client_name;
    const clientEntry = clients.get(clientKey) ?? {
      name: inv.client_name ?? "—",
      revenue: 0,
      received: 0,
      count: 0,
    };
    clientEntry.revenue += inv.total_cents ?? 0;
    clientEntry.received += inv.amount_paid_cents ?? 0;
    clientEntry.count += 1;
    clients.set(clientKey, clientEntry);

    if (inv.contract_id) {
      const meta = contractMeta.get(inv.contract_id);
      const cEntry = contractMap.get(inv.contract_id) ?? {
        name: meta?.title ?? "—",
        revenue: 0,
        received: 0,
        count: 0,
      };
      cEntry.revenue += inv.total_cents ?? 0;
      cEntry.received += inv.amount_paid_cents ?? 0;
      cEntry.count += 1;
      contractMap.set(inv.contract_id, cEntry);

      if (meta?.addressId) {
        const pEntry = properties.get(meta.addressId) ?? {
          name: meta.addressLabel ?? meta.title,
          revenue: 0,
          received: 0,
          count: 0,
        };
        pEntry.revenue += inv.total_cents ?? 0;
        pEntry.received += inv.amount_paid_cents ?? 0;
        pEntry.count += 1;
        properties.set(meta.addressId, pEntry);
      }
    }
  }

  for (const item of invoiceItems ?? []) {
    const inv = Array.isArray(item.invoice) ? item.invoice[0] : item.invoice;
    if (!inv) continue;
    const invRow = inv as { status?: string; issue_date?: string; amount_paid_cents?: number; total_cents?: number };
    if (invRow.status === "cancelled" || invRow.status === "draft") continue;
    if (invRow.issue_date && invRow.issue_date < yearStart) continue;

    const key = item.description.trim() || "Serviço";
    const sEntry = services.get(key) ?? { name: key, revenue: 0, received: 0, count: 0 };
    sEntry.revenue += item.line_total_cents ?? 0;
    const paidShare =
      invRow.total_cents && invRow.total_cents > 0
        ? Math.round(
            ((item.line_total_cents ?? 0) * (invRow.amount_paid_cents ?? 0)) / invRow.total_cents,
          )
        : 0;
    sEntry.received += paidShare;
    sEntry.count += 1;
    services.set(key, sEntry);
  }

  for (const task of tasks ?? []) {
    if (!task.service_type) continue;
    const key = task.service_type;
    if (!services.has(key)) {
      services.set(key, { name: key, revenue: 0, received: 0, count: 0 });
    }
    services.get(key)!.count += 1;

    const addr = Array.isArray(task.address) ? task.address[0] : task.address;
    const propId = (addr as { id?: string } | null)?.id;
    if (propId && task.invoice_id) {
      const inv = (invoices ?? []).find((i) => i.id === task.invoice_id);
      if (inv) {
        const pEntry = properties.get(propId) ?? {
          name: `${(addr as { label?: string; street?: string }).label ?? (addr as { street?: string }).street}, ${(addr as { city?: string }).city}`,
          revenue: 0,
          received: 0,
          count: 0,
        };
        if (!properties.has(propId)) properties.set(propId, pEntry);
      }
    }
  }

  return {
    topClients: rankFromMap(clients),
    topContracts: rankFromMap(contractMap),
    byService: rankFromMap(services),
    byProperty: rankFromMap(properties),
    totalReceivedCents,
    totalInvoicedCents,
  };
}
