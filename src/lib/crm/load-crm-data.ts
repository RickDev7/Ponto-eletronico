import { createClient } from "@/lib/supabase/server";

export async function loadCrmMembers(companyId: string) {
  const supabase = await createClient();
  const { data: memberRows } = await supabase
    .from("company_members")
    .select("user_id, profile:profiles(id, full_name)")
    .eq("company_id", companyId);

  return (
    memberRows?.map((m) => {
      const p = m.profile as
        | { id: string; full_name: string | null }
        | { id: string; full_name: string | null }[]
        | null;
      const profile = Array.isArray(p) ? p[0] : p;
      return { id: profile?.id ?? m.user_id, full_name: profile?.full_name ?? null };
    }) ?? []
  );
}

export async function loadLeads(companyId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("leads")
    .select("*, owner:profiles(full_name), contacts:lead_contacts(*)")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function loadLeadContacts(companyId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("lead_contacts")
    .select("*, lead:leads(company_name, status)")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function loadLeadById(companyId: string, leadId: string) {
  const supabase = await createClient();
  const [{ data: lead }, { data: events }] = await Promise.all([
    supabase
      .from("leads")
      .select("*, owner:profiles(full_name), contacts:lead_contacts(*)")
      .eq("id", leadId)
      .eq("company_id", companyId)
      .single(),
    supabase
      .from("lead_events")
      .select("id, event_type, message, created_at, creator:profiles(full_name)")
      .eq("lead_id", leadId)
      .eq("company_id", companyId)
      .order("created_at", { ascending: true }),
  ]);
  return { lead, events: events ?? [] };
}

export async function loadOpenLeads(companyId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("leads")
    .select("id, company_name, contact_name, email, phone, city, country, estimated_value_cents, notes, owner_id, status")
    .eq("company_id", companyId)
    .not("status", "in", '("won","lost")')
    .is("converted_client_id", null)
    .order("company_name");
  return data ?? [];
}

export async function loadRecentLeadEvents(companyId: string, limit = 20) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("lead_events")
    .select("id, event_type, message, created_at, lead:leads(id, company_name), creator:profiles(full_name)")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}
