import "server-only";

import { createClient } from "@/lib/supabase/server";
import { resolveCommercialStage } from "@/lib/commercial/workflow";
import type {
  CommercialActivityItem,
  CommercialDealRow,
  CommercialHubKpis,
  CommercialWorkflowStage,
} from "@/lib/commercial/commercial-types";
import { COMMERCIAL_WORKFLOW_STAGES } from "@/lib/commercial/commercial-types";

type LeadRow = {
  id: string;
  company_name: string;
  contact_name: string | null;
  status: string;
  estimated_value_cents: number;
  owner_id: string | null;
  converted_client_id: string | null;
  converted_quote_id: string | null;
  updated_at: string;
  owner?: { full_name: string | null } | { full_name: string | null }[] | null;
};

type QuoteRow = {
  id: string;
  lead_id: string | null;
  quote_number: string;
  status: string;
  total_cents: number;
  contract_id: string | null;
  updated_at: string;
};

type ContractRow = {
  id: string;
  lead_id: string | null;
  quote_id: string | null;
  contract_number: string | null;
  client_id: string;
};

function ownerDisplay(
  owner: LeadRow["owner"],
): string | null {
  if (!owner) return null;
  const row = Array.isArray(owner) ? owner[0] : owner;
  return row?.full_name ?? null;
}

function buildDeal(
  lead: LeadRow,
  quote: QuoteRow | null,
  contract: ContractRow | null,
): CommercialDealRow {
  const contractId = contract?.id ?? quote?.contract_id ?? null;
  const stage = resolveCommercialStage({
    leadStatus: lead.status,
    convertedClientId: lead.converted_client_id,
    quoteStatus: quote?.status ?? null,
    quoteId: quote?.id ?? lead.converted_quote_id,
    contractId,
  });

  return {
    leadId: lead.id,
    companyName: lead.company_name,
    contactName: lead.contact_name,
    stage,
    valueCents: quote?.total_cents ?? lead.estimated_value_cents,
    ownerId: lead.owner_id,
    ownerName: ownerDisplay(lead.owner),
    leadStatus: lead.status,
    quoteId: quote?.id ?? lead.converted_quote_id,
    quoteNumber: quote?.quote_number ?? null,
    quoteStatus: quote?.status ?? null,
    contractId,
    contractNumber: contract?.contract_number ?? null,
    clientId: lead.converted_client_id,
    updatedAt: quote?.updated_at ?? lead.updated_at,
  };
}

export async function loadCommercialDeals(companyId: string): Promise<CommercialDealRow[]> {
  const supabase = await createClient();

  const [{ data: leads }, { data: quotes }, { data: contracts }] = await Promise.all([
    supabase
      .from("leads")
      .select(
        "id, company_name, contact_name, status, estimated_value_cents, owner_id, converted_client_id, converted_quote_id, updated_at, owner:profiles(full_name)",
      )
      .eq("company_id", companyId)
      .neq("status", "lost")
      .order("updated_at", { ascending: false }),
    supabase
      .from("quotes")
      .select("id, lead_id, quote_number, status, total_cents, contract_id, updated_at")
      .eq("company_id", companyId)
      .not("lead_id", "is", null),
    supabase
      .from("contracts")
      .select("id, lead_id, quote_id, contract_number, client_id")
      .eq("company_id", companyId),
  ]);

  const quoteByLead = new Map<string, QuoteRow>();
  for (const q of (quotes ?? []) as QuoteRow[]) {
    if (!q.lead_id) continue;
    const existing = quoteByLead.get(q.lead_id);
    if (!existing || q.updated_at > existing.updated_at) {
      quoteByLead.set(q.lead_id, q);
    }
  }

  const contractByQuote = new Map<string, ContractRow>();
  const contractByLead = new Map<string, ContractRow>();
  for (const c of (contracts ?? []) as ContractRow[]) {
    if (c.quote_id) contractByQuote.set(c.quote_id, c);
    if (c.lead_id) contractByLead.set(c.lead_id, c);
  }

  return ((leads ?? []) as LeadRow[]).map((lead) => {
    const quote = quoteByLead.get(lead.id) ?? null;
    const contract =
      (quote && contractByQuote.get(quote.id)) ??
      contractByLead.get(lead.id) ??
      null;
    return buildDeal(lead, quote, contract);
  });
}

export function computeCommercialKpis(deals: CommercialDealRow[]): CommercialHubKpis {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const open = deals.filter((d) => d.stage !== "client");
  const clients = deals.filter((d) => d.stage === "client");
  const wonThisMonth = clients.filter((d) => d.updatedAt.slice(0, 10) >= monthStart).length;
  const decided = clients.length;
  const lost = 0;

  return {
    activeDeals: open.length,
    pipelineValueCents: open.reduce((s, d) => s + d.valueCents, 0),
    awaitingApproval: deals.filter((d) => d.stage === "approval").length,
    wonThisMonth,
    conversionRate: decided + lost === 0 ? 0 : Math.round((decided / (decided + lost)) * 100),
    openQuotes: deals.filter((d) => d.stage === "quote" || d.stage === "approval").length,
  };
}

export function groupDealsByStage(
  deals: CommercialDealRow[],
): Record<CommercialWorkflowStage, CommercialDealRow[]> {
  const map = Object.fromEntries(
    COMMERCIAL_WORKFLOW_STAGES.map((s) => [s, [] as CommercialDealRow[]]),
  ) as Record<CommercialWorkflowStage, CommercialDealRow[]>;

  for (const deal of deals) {
    map[deal.stage].push(deal);
  }
  return map;
}

export async function loadCommercialActivity(
  companyId: string,
  slug: string,
  limit = 12,
): Promise<CommercialActivityItem[]> {
  const supabase = await createClient();

  const [{ data: leadEvents }, { data: quoteEvents }] = await Promise.all([
    supabase
      .from("lead_events")
      .select(
        "id, event_type, message, created_at, lead:leads(id, company_name), creator:profiles(full_name)",
      )
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(limit),
    supabase
      .from("quote_events")
      .select(
        "id, event_type, message, created_at, quote:quotes(id, quote_number, lead_id), creator:profiles(full_name)",
      )
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(limit),
  ]);

  const items: CommercialActivityItem[] = [];

  for (const ev of leadEvents ?? []) {
    const lead = ev.lead as { id: string; company_name: string } | { id: string; company_name: string }[] | null;
    const row = Array.isArray(lead) ? lead[0] : lead;
    const creator = ev.creator as { full_name: string | null } | { full_name: string | null }[] | null;
    const actor = Array.isArray(creator) ? creator[0] : creator;
    if (!row) continue;
    items.push({
      id: `lead-${ev.id}`,
      type: "lead",
      eventType: ev.event_type,
      message: ev.message,
      entityLabel: row.company_name,
      entityHref: `/${slug}/crm/leads/${row.id}`,
      createdAt: ev.created_at,
      actorName: actor?.full_name ?? null,
    });
  }

  for (const ev of quoteEvents ?? []) {
    const quote = ev.quote as
      | { id: string; quote_number: string; lead_id: string | null }
      | { id: string; quote_number: string; lead_id: string | null }[]
      | null;
    const row = Array.isArray(quote) ? quote[0] : quote;
    const creator = ev.creator as { full_name: string | null } | { full_name: string | null }[] | null;
    const actor = Array.isArray(creator) ? creator[0] : creator;
    if (!row) continue;
    items.push({
      id: `quote-${ev.id}`,
      type: "quote",
      eventType: ev.event_type,
      message: ev.message,
      entityLabel: row.quote_number,
      entityHref: `/${slug}/finance/quotes/${row.id}`,
      createdAt: ev.created_at,
      actorName: actor?.full_name ?? null,
    });
  }

  return items
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}

export async function loadCommercialHubData(companyId: string, slug: string) {
  const [deals, activity] = await Promise.all([
    loadCommercialDeals(companyId),
    loadCommercialActivity(companyId, slug),
  ]);
  return {
    deals,
    kpis: computeCommercialKpis(deals),
    byStage: groupDealsByStage(deals),
    activity,
  };
}
