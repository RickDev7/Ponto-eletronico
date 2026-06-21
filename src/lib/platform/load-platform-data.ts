import "server-only";

import { createClient } from "@/lib/supabase/server";
import { PLANS } from "@/lib/billing/plans";
import type { PlanKey } from "@/lib/billing/plans";
import type {
  FeatureFlagRow,
  PlatformAuditRow,
  PlatformDashboardStats,
  PlatformLogRow,
  PlatformSubscriptionRow,
  PlatformSupportTicketRow,
  PlatformTenantRow,
} from "@/types/platform";

export async function loadPlatformDashboardStats(): Promise<PlatformDashboardStats> {
  const supabase = await createClient();

  const [
    { count: totalTenants },
    { count: activeTenants },
    { count: suspendedTenants },
    { count: trialingSubscriptions },
    { count: openTickets },
    { data: subs },
  ] = await Promise.all([
    supabase.from("companies").select("id", { count: "exact", head: true }),
    supabase.from("companies").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("companies").select("id", { count: "exact", head: true }).eq("status", "suspended"),
    supabase.from("subscriptions").select("id", { count: "exact", head: true }).eq("status", "trialing"),
    supabase
      .from("support_tickets")
      .select("id", { count: "exact", head: true })
      .in("status", ["open", "in_progress", "waiting"]),
    supabase
      .from("subscriptions")
      .select("plan_key, status")
      .in("status", ["active", "trialing"]),
  ]);

  const mrrCents = (subs ?? []).reduce((sum, s) => {
    if (s.status !== "active" && s.status !== "trialing") return sum;
    const plan = PLANS[s.plan_key as PlanKey];
    return sum + (plan?.priceMonthlyCents ?? 0);
  }, 0);

  return {
    totalTenants: totalTenants ?? 0,
    activeTenants: activeTenants ?? 0,
    suspendedTenants: suspendedTenants ?? 0,
    trialingSubscriptions: trialingSubscriptions ?? 0,
    openTickets: openTickets ?? 0,
    mrrCents,
  };
}

export async function loadPlatformTenants(limit = 100): Promise<PlatformTenantRow[]> {
  const supabase = await createClient();

  const { data: companies } = await supabase
    .from("companies")
    .select("id, name, slug, status, email, created_at, suspended_at, suspended_reason")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (!companies?.length) return [];

  const ids = companies.map((c) => c.id);

  const [{ data: members }, { data: subscriptions }] = await Promise.all([
    supabase.from("company_members").select("company_id").in("company_id", ids).eq("status", "active"),
    supabase
      .from("subscriptions")
      .select("company_id, plan_key, status, trial_ends_at")
      .in("company_id", ids),
  ]);

  const memberCounts = new Map<string, number>();
  for (const m of members ?? []) {
    memberCounts.set(m.company_id, (memberCounts.get(m.company_id) ?? 0) + 1);
  }

  const subByCompany = new Map(
    (subscriptions ?? []).map((s) => [s.company_id, s]),
  );

  return companies.map((c) => {
    const sub = subByCompany.get(c.id);
    return {
      ...c,
      status: c.status as PlatformTenantRow["status"],
      member_count: memberCounts.get(c.id) ?? 0,
      subscription: sub
        ? {
            plan_key: sub.plan_key,
            status: sub.status,
            trial_ends_at: sub.trial_ends_at,
          }
        : null,
    };
  });
}

export async function loadPlatformSubscriptions(
  limit = 100,
): Promise<PlatformSubscriptionRow[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("subscriptions")
    .select(
      `
      id, company_id, plan_key, status, stripe_customer_id,
      trial_ends_at, current_period_end, cancel_at_period_end, created_at,
      company:companies(name, slug)
    `,
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []).map((row) => {
    const company = Array.isArray(row.company) ? row.company[0] : row.company;
    return {
      id: row.id,
      company_id: row.company_id,
      company_name: (company as { name?: string })?.name ?? "—",
      company_slug: (company as { slug?: string })?.slug ?? "—",
      plan_key: row.plan_key,
      status: row.status,
      stripe_customer_id: row.stripe_customer_id,
      trial_ends_at: row.trial_ends_at,
      current_period_end: row.current_period_end,
      cancel_at_period_end: row.cancel_at_period_end,
      created_at: row.created_at,
    };
  });
}

export async function loadPlatformSupportTickets(
  limit = 100,
): Promise<PlatformSupportTicketRow[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("support_tickets")
    .select(
      `
      id, company_id, subject, status, priority, created_by,
      assigned_to, created_at, updated_at,
      company:companies(name),
      author:profiles!support_tickets_created_by_fkey(full_name)
    `,
    )
    .order("updated_at", { ascending: false })
    .limit(limit);

  const ticketIds = (data ?? []).map((t) => t.id);
  const { data: msgCounts } = ticketIds.length
    ? await supabase.from("support_messages").select("ticket_id").in("ticket_id", ticketIds)
    : { data: [] };

  const countMap = new Map<string, number>();
  for (const m of msgCounts ?? []) {
    countMap.set(m.ticket_id, (countMap.get(m.ticket_id) ?? 0) + 1);
  }

  return (data ?? []).map((row) => {
    const company = Array.isArray(row.company) ? row.company[0] : row.company;
    const author = Array.isArray(row.author) ? row.author[0] : row.author;
    return {
      id: row.id,
      company_id: row.company_id,
      company_name: (company as { name?: string })?.name ?? "—",
      subject: row.subject,
      status: row.status as PlatformSupportTicketRow["status"],
      priority: row.priority as PlatformSupportTicketRow["priority"],
      created_by: row.created_by,
      author_name: (author as { full_name?: string })?.full_name ?? null,
      assigned_to: row.assigned_to,
      created_at: row.created_at,
      updated_at: row.updated_at,
      message_count: countMap.get(row.id) ?? 0,
    };
  });
}

export async function loadPlatformLogs(limit = 200): Promise<PlatformLogRow[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("platform_logs")
    .select(
      `
      id, level, source, message, company_id, metadata, created_at,
      company:companies(name)
    `,
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []).map((row) => {
    const company = Array.isArray(row.company) ? row.company[0] : row.company;
    return {
      id: row.id,
      level: row.level as PlatformLogRow["level"],
      source: row.source,
      message: row.message,
      company_id: row.company_id,
      company_name: (company as { name?: string } | null)?.name ?? null,
      metadata: (row.metadata as Record<string, unknown>) ?? {},
      created_at: row.created_at,
    };
  });
}

export async function loadPlatformAuditLogs(limit = 200): Promise<PlatformAuditRow[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("platform_audit_logs")
    .select(
      `
      id, actor_id, action, target_type, target_id, company_id, metadata, created_at,
      actor:profiles!platform_audit_logs_actor_id_fkey(full_name),
      company:companies(name)
    `,
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []).map((row) => {
    const actor = Array.isArray(row.actor) ? row.actor[0] : row.actor;
    const company = Array.isArray(row.company) ? row.company[0] : row.company;
    return {
      id: row.id,
      actor_id: row.actor_id,
      actor_name: (actor as { full_name?: string } | null)?.full_name ?? null,
      action: row.action,
      target_type: row.target_type,
      target_id: row.target_id,
      company_id: row.company_id,
      company_name: (company as { name?: string } | null)?.name ?? null,
      metadata: (row.metadata as Record<string, unknown>) ?? {},
      created_at: row.created_at,
    };
  });
}

export async function loadFeatureFlags(): Promise<FeatureFlagRow[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("feature_flags")
    .select(
      `
      id, key, enabled, company_id, plan_key, description, updated_at,
      company:companies(name)
    `,
    )
    .order("key")
    .order("company_id", { nullsFirst: true });

  return (data ?? []).map((row) => {
    const company = Array.isArray(row.company) ? row.company[0] : row.company;
    return {
      id: row.id,
      key: row.key,
      enabled: row.enabled,
      company_id: row.company_id,
      company_name: (company as { name?: string } | null)?.name ?? null,
      plan_key: row.plan_key,
      description: row.description,
      updated_at: row.updated_at,
    };
  });
}
