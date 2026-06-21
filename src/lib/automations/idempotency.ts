import type { SupabaseClient } from "@supabase/supabase-js";
import type { AutomationEventPayload, AutomationRuleRow } from "@/lib/automations/types";

const COOLDOWN_MS: Record<string, number> = {
  "invoice.overdue": 24 * 60 * 60 * 1000,
  "service.completed": 0,
  "service.approved": 0,
  "contract.created": 0,
};

export function buildAutomationDedupeKey(
  triggerType: string,
  payload: AutomationEventPayload,
): string | null {
  switch (triggerType) {
    case "invoice.overdue":
      return payload.invoiceId ? `invoice:${payload.invoiceId}` : null;
    case "contract.created":
      return payload.contractId ? `contract:${payload.contractId}` : null;
    case "service.completed":
    case "service.approved":
      return payload.taskId ? `task:${payload.taskId}` : null;
    case "lead.won":
    case "lead.qualified":
      return payload.leadId ? `lead:${payload.leadId}` : null;
    case "quote.sent":
    case "quote.approved":
      return payload.quoteId ? `quote:${payload.quoteId}` : null;
    default:
      return payload.entityType && payload.entityId
        ? `${payload.entityType}:${payload.entityId}`
        : null;
  }
}

export async function shouldSkipAutomationDedupe(
  supabase: SupabaseClient,
  rule: AutomationRuleRow,
  payload: AutomationEventPayload,
): Promise<boolean> {
  const dedupeKey = buildAutomationDedupeKey(rule.trigger_type, payload);
  if (!dedupeKey) return false;

  const cooldown = COOLDOWN_MS[rule.trigger_type];
  if (cooldown === 0) {
    const { data } = await supabase
      .from("automation_dedup")
      .select("dedupe_key")
      .eq("company_id", rule.company_id)
      .eq("rule_id", rule.id)
      .eq("dedupe_key", dedupeKey)
      .maybeSingle();
    return Boolean(data);
  }

  const { data } = await supabase
    .from("automation_dedup")
    .select("last_run_at")
    .eq("company_id", rule.company_id)
    .eq("rule_id", rule.id)
    .eq("dedupe_key", dedupeKey)
    .maybeSingle();

  if (!data?.last_run_at) return false;
  return Date.now() - new Date(data.last_run_at).getTime() < cooldown;
}

export async function recordAutomationDedupe(
  supabase: SupabaseClient,
  rule: AutomationRuleRow,
  payload: AutomationEventPayload,
): Promise<void> {
  const dedupeKey = buildAutomationDedupeKey(rule.trigger_type, payload);
  if (!dedupeKey) return;

  await supabase.from("automation_dedup").upsert(
    {
      company_id: rule.company_id,
      rule_id: rule.id,
      dedupe_key: dedupeKey,
      last_run_at: new Date().toISOString(),
    },
    { onConflict: "company_id,rule_id,dedupe_key" },
  );
}
