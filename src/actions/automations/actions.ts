"use server";

import { revalidatePath } from "next/cache";
import { requireCompanyContext } from "@/lib/auth/guards";
import { requirePermission } from "@/config/permissions";
import { createClient } from "@/lib/supabase/server";
import { emitAutomationEvent, runAutomationRule } from "@/lib/automations/engine";
import {
  createAutomationRuleSchema,
  updateAutomationRuleSchema,
  type CreateAutomationRuleInput,
} from "@/lib/validations/automations";
import type { AutomationEventPayload } from "@/lib/automations/types";
import type { AutomationRuleRow } from "@/lib/automations/types";
import type { AutomationActionStep, AutomationCondition } from "@/lib/validations/automations";

type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string };

function revalidateAutomations(slug: string) {
  revalidatePath(`/${slug}/automations`);
}

function mapRule(row: Record<string, unknown>): AutomationRuleRow {
  const base = row as unknown as AutomationRuleRow;
  return {
    ...base,
    conditions: (row.conditions as AutomationCondition[]) ?? [],
    actions: (row.actions as AutomationActionStep[]) ?? [],
  };
}

export async function createAutomationRuleAction(
  slug: string,
  input: CreateAutomationRuleInput,
): Promise<ActionResult<{ id: string }>> {
  const ctx = await requireCompanyContext({ slug, minRole: "supervisor" });
  requirePermission(ctx.membership.role, "automations:write");

  const parsed = createAutomationRuleSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("automation_rules")
    .insert({
      company_id: ctx.company.id,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      trigger_type: parsed.data.triggerType,
      conditions: parsed.data.conditions,
      actions: parsed.data.actions,
      is_enabled: parsed.data.isEnabled,
      created_by: ctx.profile.id,
    })
    .select("id")
    .single();

  if (error || !data) return { success: false, error: error?.message ?? "Failed" };

  revalidateAutomations(slug);
  return { success: true, data: { id: data.id } };
}

export async function updateAutomationRuleAction(
  slug: string,
  ruleId: string,
  input: CreateAutomationRuleInput,
): Promise<ActionResult<{ id: string }>> {
  const ctx = await requireCompanyContext({ slug, minRole: "supervisor" });
  requirePermission(ctx.membership.role, "automations:write");

  const parsed = updateAutomationRuleSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("automation_rules")
    .update({
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      trigger_type: parsed.data.triggerType,
      conditions: parsed.data.conditions,
      actions: parsed.data.actions,
      is_enabled: parsed.data.isEnabled,
    })
    .eq("id", ruleId)
    .eq("company_id", ctx.company.id);

  if (error) return { success: false, error: error.message };

  revalidateAutomations(slug);
  return { success: true, data: { id: ruleId } };
}

export async function toggleAutomationRuleAction(
  slug: string,
  ruleId: string,
  enabled: boolean,
): Promise<ActionResult> {
  const ctx = await requireCompanyContext({ slug, minRole: "supervisor" });
  requirePermission(ctx.membership.role, "automations:write");

  const supabase = await createClient();
  const { error } = await supabase
    .from("automation_rules")
    .update({ is_enabled: enabled })
    .eq("id", ruleId)
    .eq("company_id", ctx.company.id);

  if (error) return { success: false, error: error.message };

  revalidateAutomations(slug);
  return { success: true, data: undefined };
}

export async function deleteAutomationRuleAction(
  slug: string,
  ruleId: string,
): Promise<ActionResult> {
  const ctx = await requireCompanyContext({ slug, minRole: "supervisor" });
  requirePermission(ctx.membership.role, "automations:write");

  const supabase = await createClient();
  const { error } = await supabase
    .from("automation_rules")
    .delete()
    .eq("id", ruleId)
    .eq("company_id", ctx.company.id);

  if (error) return { success: false, error: error.message };

  revalidateAutomations(slug);
  return { success: true, data: undefined };
}

export async function testAutomationRuleAction(
  slug: string,
  ruleId: string,
  payload: AutomationEventPayload,
): Promise<ActionResult<{ status: string }>> {
  const ctx = await requireCompanyContext({ slug, minRole: "supervisor" });
  requirePermission(ctx.membership.role, "automations:write");

  const supabase = await createClient();
  const { data: raw } = await supabase
    .from("automation_rules")
    .select("*")
    .eq("id", ruleId)
    .eq("company_id", ctx.company.id)
    .single();

  if (!raw) return { success: false, error: "Rule not found" };

  const result = await runAutomationRule(supabase, mapRule(raw), payload, slug);
  revalidateAutomations(slug);
  return { success: true, data: { status: result.status } };
}

export async function seedExampleAutomationsAction(
  slug: string,
): Promise<ActionResult<{ count: number }>> {
  const ctx = await requireCompanyContext({ slug, minRole: "supervisor" });
  requirePermission(ctx.membership.role, "automations:write");

  const supabase = await createClient();
  const { count } = await supabase
    .from("automation_rules")
    .select("id", { count: "exact", head: true })
    .eq("company_id", ctx.company.id);

  if ((count ?? 0) > 0) {
    return { success: false, error: "already_seeded" };
  }

  const examples: CreateAutomationRuleInput[] = [
    {
      name: "Contrato → Serviço",
      description: "Gera tarefas de serviço quando um contrato é criado com imóvel vinculado.",
      triggerType: "contract.created",
      conditions: [{ field: "hasAddress", operator: "eq", value: true }],
      actions: [{ type: "generate_service" }],
      isEnabled: true,
    },
    {
      name: "Serviço concluído → Relatório",
      description: "Gera relatório de serviço quando a execução é concluída/aprovada.",
      triggerType: "service.completed",
      conditions: [],
      actions: [{ type: "generate_report" }],
      isEnabled: true,
    },
    {
      name: "Fatura vencida → Lembrete",
      description: "Envia lembrete por e-mail quando a fatura está vencida (máx. 1x por dia).",
      triggerType: "invoice.overdue",
      conditions: [{ field: "daysOverdue", operator: "gt", value: 0 }],
      actions: [
        {
          type: "send_reminder",
          channel: "email",
          config: {
            subject: "Lembrete: fatura {invoiceNumber} em aberto",
            body: "Olá {clientName}, a fatura {invoiceNumber} venceu em {dueDate}. Por favor regularize o pagamento.",
          },
        },
      ],
      isEnabled: true,
    },
  ];

  const { error } = await supabase.from("automation_rules").insert(
    examples.map((ex) => ({
      company_id: ctx.company.id,
      name: ex.name,
      description: ex.description ?? null,
      trigger_type: ex.triggerType,
      conditions: ex.conditions,
      actions: ex.actions,
      is_enabled: ex.isEnabled,
      created_by: ctx.profile.id,
    })),
  );

  if (error) return { success: false, error: error.message };

  revalidateAutomations(slug);
  return { success: true, data: { count: examples.length } };
}

export { emitAutomationEvent };
