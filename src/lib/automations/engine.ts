import type { SupabaseClient } from "@supabase/supabase-js";
import { evaluateConditions } from "@/lib/automations/conditions";
import { executeAutomationAction } from "@/lib/automations/execute-action";
import {
  recordAutomationDedupe,
  shouldSkipAutomationDedupe,
} from "@/lib/automations/idempotency";
import type {
  AutomationEventPayload,
  AutomationRuleRow,
  EmitAutomationEventParams,
} from "@/lib/automations/types";
import type { AutomationActionStep, AutomationCondition } from "@/lib/validations/automations";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

function parseRuleRow(row: Record<string, unknown>): AutomationRuleRow {
  return {
    ...(row as AutomationRuleRow),
    conditions: (row.conditions as AutomationCondition[]) ?? [],
    actions: (row.actions as AutomationActionStep[]) ?? [],
  };
}

export async function runAutomationRule(
  supabase: SupabaseClient,
  rule: AutomationRuleRow,
  payload: AutomationEventPayload,
  slug?: string,
): Promise<{ runId: string; status: "success" | "failed" | "skipped" }> {
  if (await shouldSkipAutomationDedupe(supabase, rule, payload)) {
    const { data: skipped } = await supabase
      .from("automation_runs")
      .insert({
        company_id: rule.company_id,
        rule_id: rule.id,
        trigger_type: rule.trigger_type,
        trigger_payload: payload,
        status: "skipped",
        error_message: "dedupe",
        completed_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    return { runId: skipped?.id ?? "", status: "skipped" };
  }

  if (!evaluateConditions(rule.conditions, payload)) {
    const { data: skipped } = await supabase
      .from("automation_runs")
      .insert({
        company_id: rule.company_id,
        rule_id: rule.id,
        trigger_type: rule.trigger_type,
        trigger_payload: payload,
        status: "skipped",
        completed_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    return { runId: skipped?.id ?? "", status: "skipped" };
  }

  const { data: run, error: runError } = await supabase
    .from("automation_runs")
    .insert({
      company_id: rule.company_id,
      rule_id: rule.id,
      trigger_type: rule.trigger_type,
      trigger_payload: payload,
      status: "running",
    })
    .select("id")
    .single();

  if (runError || !run) {
    return { runId: "", status: "failed" };
  }

  try {
    for (const action of rule.actions) {
      await executeAutomationAction(action, {
        supabase,
        companyId: rule.company_id,
        runId: run.id,
        payload,
        slug,
      });
    }

    await supabase
      .from("automation_runs")
      .update({ status: "success", completed_at: new Date().toISOString() })
      .eq("id", run.id);

    await recordAutomationDedupe(supabase, rule, payload);

    return { runId: run.id, status: "success" };
  } catch (err) {
    const message = err instanceof Error ? err.message : "execution_failed";
    await supabase
      .from("automation_runs")
      .update({
        status: "failed",
        error_message: message,
        completed_at: new Date().toISOString(),
      })
      .eq("id", run.id);
    return { runId: run.id, status: "failed" };
  }
}

export async function emitAutomationEvent(
  params: EmitAutomationEventParams,
): Promise<void> {
  const supabase = await createClient();

  const { data: rules } = await supabase
    .from("automation_rules")
    .select("*")
    .eq("company_id", params.companyId)
    .eq("trigger_type", params.trigger)
    .eq("is_enabled", true);

  if (!rules?.length) return;

  for (const raw of rules) {
    const rule = parseRuleRow(raw);
    await runAutomationRule(supabase, rule, params.payload, params.slug);
  }
}

export async function emitAutomationEventAdmin(
  params: EmitAutomationEventParams,
): Promise<void> {
  const supabase = createAdminClient();

  const { data: rules } = await supabase
    .from("automation_rules")
    .select("*")
    .eq("company_id", params.companyId)
    .eq("trigger_type", params.trigger)
    .eq("is_enabled", true);

  if (!rules?.length) return;

  for (const raw of rules) {
    const rule = parseRuleRow(raw);
    await runAutomationRule(supabase, rule, params.payload, params.slug);
  }
}

export async function scanOverdueInvoicesAutomations(): Promise<number> {
  const supabase = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data: rules } = await supabase
    .from("automation_rules")
    .select("company_id")
    .eq("trigger_type", "invoice.overdue")
    .eq("is_enabled", true);

  const companyIds = [...new Set((rules ?? []).map((r) => r.company_id))];
  let processed = 0;

  for (const companyId of companyIds) {
    const { data: invoices } = await supabase
      .from("invoices")
      .select(
        "id, invoice_number, client_name, client_email, client_phone, due_date, total_cents, amount_paid_cents, status, contract_id",
      )
      .eq("company_id", companyId)
      .in("status", ["sent", "partial", "overdue"])
      .lt("due_date", today);

    for (const inv of invoices ?? []) {
      const balanceCents = Math.max(0, (inv.total_cents ?? 0) - (inv.amount_paid_cents ?? 0));
      if (balanceCents <= 0) continue;

      const daysOverdue = Math.floor(
        (Date.now() - new Date(inv.due_date).getTime()) / 86400000,
      );

      const { data: company } = await supabase
        .from("companies")
        .select("slug")
        .eq("id", companyId)
        .single();

      await emitAutomationEventAdmin({
        companyId,
        trigger: "invoice.overdue",
        slug: company?.slug,
        payload: {
          invoiceId: inv.id,
          invoiceNumber: inv.invoice_number,
          clientName: inv.client_name,
          clientEmail: inv.client_email,
          clientPhone: inv.client_phone,
          dueDate: inv.due_date,
          balanceCents,
          daysOverdue,
          contractId: inv.contract_id,
          entityType: "invoice",
          entityId: inv.id,
        },
      });
      processed += 1;
    }
  }

  return processed;
}
