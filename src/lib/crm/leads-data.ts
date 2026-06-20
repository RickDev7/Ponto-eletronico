import type { LeadStatus } from "@/lib/validations/crm";

export const LEAD_PIPELINE_COLUMNS: LeadStatus[] = [
  "new",
  "contacted",
  "qualified",
  "proposal_sent",
  "negotiation",
  "won",
  "lost",
];

/** Colunas visíveis no kanban (sem Perdido — ver lista de leads). */
export const LEAD_KANBAN_COLUMNS: LeadStatus[] = [
  "new",
  "contacted",
  "qualified",
  "proposal_sent",
  "negotiation",
  "won",
];

export interface LeadListRow {
  id: string;
  company_name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  city: string | null;
  country: string;
  estimated_value_cents: number;
  notes: string | null;
  status: string;
  owner_id: string | null;
  converted_client_id: string | null;
  converted_quote_id: string | null;
  created_at: string;
  updated_at: string;
  owner?: { full_name: string | null } | Array<{ full_name: string | null }> | null;
  contacts?: LeadContactRow[];
}

export interface LeadContactRow {
  id: string;
  lead_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role_title: string | null;
  is_primary: boolean;
  created_at: string;
  lead?: { company_name: string; status: string } | Array<{ company_name: string; status: string }> | null;
}

export function isLeadReadonly(lead: Pick<LeadListRow, "converted_client_id" | "status">): boolean {
  return Boolean(lead.converted_client_id) || lead.status === "won";
}

export function ownerName(lead: LeadListRow): string {
  const o = lead.owner;
  if (!o) return "—";
  const row = Array.isArray(o) ? o[0] : o;
  return row?.full_name ?? "—";
}

export function leadAddress(lead: Pick<LeadListRow, "city" | "country">): string {
  return [lead.city, lead.country].filter(Boolean).join(", ");
}

export interface CrmDashboardKpis {
  activeLeads: number;
  proposalsSent: number;
  conversionRate: number;
  potentialRevenueCents: number;
  closedRevenueCents: number;
  wonThisMonth: number;
}

export interface CrmCompanyAggregate {
  companyName: string;
  leadCount: number;
  totalValueCents: number;
  bestStatus: string;
  latestLeadId: string;
  city: string | null;
  website: string | null;
}

export interface CrmActivityEvent {
  id: string;
  event_type: string;
  message: string | null;
  created_at: string;
  lead?: { id: string; company_name: string } | Array<{ id: string; company_name: string }> | null;
  creator?: { full_name: string | null } | Array<{ full_name: string | null }> | null;
}

export function aggregateLeadCompanies(leads: LeadListRow[]): CrmCompanyAggregate[] {
  const map = new Map<string, CrmCompanyAggregate & { statusRank: number }>();
  const statusRank: Record<string, number> = {
    won: 6,
    negotiation: 5,
    proposal_sent: 4,
    qualified: 3,
    contacted: 2,
    new: 1,
    lost: 0,
  };

  for (const lead of leads) {
    if (lead.converted_client_id) continue;
    const key = lead.company_name.trim().toLowerCase();
    const rank = statusRank[lead.status] ?? 0;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, {
        companyName: lead.company_name,
        leadCount: 1,
        totalValueCents: lead.estimated_value_cents,
        bestStatus: lead.status,
        latestLeadId: lead.id,
        city: lead.city,
        website: lead.website,
        statusRank: rank,
      });
    } else {
      existing.leadCount += 1;
      existing.totalValueCents += lead.estimated_value_cents;
      if (rank > existing.statusRank) {
        existing.bestStatus = lead.status;
        existing.statusRank = rank;
        existing.latestLeadId = lead.id;
      }
      if (!existing.city && lead.city) existing.city = lead.city;
      if (!existing.website && lead.website) existing.website = lead.website;
    }
  }

  return [...map.values()]
    .map(({ statusRank: _, ...row }) => row)
    .sort((a, b) => b.totalValueCents - a.totalValueCents);
}

export function parseLeadNotesMeta(notes: string | null) {
  if (!notes) return { intendedService: "", leadSource: "", body: "" };
  const lines = notes.split("\n");
  let intendedService = "";
  let leadSource = "";
  const body: string[] = [];
  for (const line of lines) {
    if (line.startsWith("Serviço:")) intendedService = line.replace("Serviço:", "").trim();
    else if (line.startsWith("Origem:")) leadSource = line.replace("Origem:", "").trim();
    else if (line.startsWith("Service:")) intendedService = line.replace("Service:", "").trim();
    else if (line.startsWith("Source:")) leadSource = line.replace("Source:", "").trim();
    else body.push(line);
  }
  return { intendedService, leadSource, body: body.join("\n").trim() };
}

export function composeLeadNotes(intendedService: string, leadSource: string, body: string) {
  return [
    intendedService ? `Serviço: ${intendedService}` : "",
    leadSource ? `Origem: ${leadSource}` : "",
    body.trim(),
  ]
    .filter(Boolean)
    .join("\n");
}

export function computeCrmKpis(leads: LeadListRow[]): CrmDashboardKpis {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const open = leads.filter((l) => l.status !== "won" && l.status !== "lost");
  const won = leads.filter((l) => l.status === "won");
  const lost = leads.filter((l) => l.status === "lost");
  const decided = won.length + lost.length;
  const wonThisMonth = won.filter((l) => l.updated_at.slice(0, 10) >= monthStart).length;

  return {
    activeLeads: open.length,
    proposalsSent: leads.filter((l) =>
      ["proposal_sent", "negotiation", "won"].includes(l.status),
    ).length,
    conversionRate: decided === 0 ? 0 : Math.round((won.length / decided) * 100),
    potentialRevenueCents: open.reduce((s, l) => s + l.estimated_value_cents, 0),
    closedRevenueCents: won.reduce((s, l) => s + l.estimated_value_cents, 0),
    wonThisMonth,
  };
}

export function leadToQuotePrefill(lead: LeadListRow) {
  const primary = lead.contacts?.find((c) => c.is_primary) ?? lead.contacts?.[0];
  return {
    leadId: lead.id,
    clientName: primary?.name ?? lead.contact_name ?? lead.company_name,
    clientCompany: lead.company_name,
    clientEmail: primary?.email ?? lead.email ?? "",
    clientPhone: primary?.phone ?? lead.phone ?? "",
    clientAddress: leadAddress(lead),
    assignedTo: lead.owner_id,
    internalNotes: lead.notes ?? "",
  };
}
