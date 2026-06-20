import { createClient } from "@/lib/supabase/server";
import type {
  AutomationDeliveryRow,
  AutomationRuleRow,
  AutomationRunRow,
} from "@/lib/automations/types";
import type { AutomationActionStep, AutomationCondition } from "@/lib/validations/automations";

function mapRule(row: Record<string, unknown>): AutomationRuleRow {
  return {
    ...(row as AutomationRuleRow),
    conditions: (row.conditions as AutomationCondition[]) ?? [],
    actions: (row.actions as AutomationActionStep[]) ?? [],
  };
}

export async function loadAutomationRules(companyId: string): Promise<AutomationRuleRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("automation_rules")
    .select("*")
    .eq("company_id", companyId)
    .order("updated_at", { ascending: false });

  return (data ?? []).map(mapRule);
}

export async function loadAutomationRuns(
  companyId: string,
  limit = 30,
): Promise<AutomationRunRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("automation_runs")
    .select("*, rule:automation_rules(name)")
    .eq("company_id", companyId)
    .order("started_at", { ascending: false })
    .limit(limit);

  return (data ?? []) as AutomationRunRow[];
}

export async function loadAutomationDeliveries(
  companyId: string,
  limit = 20,
): Promise<AutomationDeliveryRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("automation_deliveries")
    .select("id, run_id, channel, recipient, subject, status, provider, error_message, created_at, sent_at")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []) as AutomationDeliveryRow[];
}

export interface AutomationsPageData {
  rules: AutomationRuleRow[];
  runs: AutomationRunRow[];
  deliveries: AutomationDeliveryRow[];
  stats: {
    activeRules: number;
    runsToday: number;
    queuedDeliveries: number;
  };
}

export async function loadAutomationsPageData(companyId: string): Promise<AutomationsPageData> {
  const [rules, runs, deliveries] = await Promise.all([
    loadAutomationRules(companyId),
    loadAutomationRuns(companyId),
    loadAutomationDeliveries(companyId),
  ]);

  const today = new Date().toISOString().slice(0, 10);
  const runsToday = runs.filter((r) => r.started_at.slice(0, 10) === today).length;
  const queuedDeliveries = deliveries.filter((d) => d.status === "queued").length;

  return {
    rules,
    runs,
    deliveries,
    stats: {
      activeRules: rules.filter((r) => r.is_enabled).length,
      runsToday,
      queuedDeliveries,
    },
  };
}
