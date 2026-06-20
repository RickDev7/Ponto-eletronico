"use server";

import { revalidatePath } from "next/cache";
import { emitAutomationEvent } from "@/lib/automations/engine";
import { requireCompanyContext } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { generateOccurrenceDates, type RecurrenceRule } from "@/lib/recurring/generator";
import {
  createServiceSchema,
  createTeamSchema,
  DEFAULT_SERVICES,
  type CreateServiceInput,
  type CreateTeamInput,
} from "@/lib/validations/operations";
import type { ActionResult } from "@/actions/auth/actions";
import type { ServiceType } from "@/types";

function operationsPaths(slug: string) {
  return [
    `/${slug}/operations`,
    `/${slug}/operations/properties`,
    `/${slug}/operations/services`,
    `/${slug}/operations/scheduling`,
    `/${slug}/operations/calendar`,
    `/${slug}/operations/teams`,
    `/${slug}/operations/routes`,
    `/${slug}/operations/jobs`,
    `/${slug}/tasks`,
    `/${slug}/calendar`,
    `/${slug}/schedule`,
    `/${slug}/addresses`,
  ];
}

function revalidateOperations(slug: string) {
  for (const path of operationsPaths(slug)) {
    revalidatePath(path);
  }
  revalidatePath(`/${slug}/operations`, "layout");
}

async function logTaskEvent(
  supabase: Awaited<ReturnType<typeof createClient>>,
  params: {
    companyId: string;
    taskId: string;
    eventType: string;
    createdBy?: string | null;
    message?: string;
    metadata?: Record<string, unknown>;
  },
) {
  await supabase.from("task_events").insert({
    company_id: params.companyId,
    task_id: params.taskId,
    event_type: params.eventType,
    message: params.message ?? null,
    metadata: params.metadata ?? {},
    created_by: params.createdBy ?? null,
  });
}

function contractFrequencyToRule(frequency: string): RecurrenceRule {
  const map: Record<string, RecurrenceRule> = {
    monthly: { type: "monthly", interval: 1, until: null, occurrences: 6 },
    bimonthly: { type: "monthly", interval: 2, until: null, occurrences: 6 },
    quarterly: { type: "monthly", interval: 3, until: null, occurrences: 4 },
    semiannual: { type: "monthly", interval: 6, until: null, occurrences: 4 },
    annual: { type: "monthly", interval: 12, until: null, occurrences: 3 },
  };
  return map[frequency] ?? map.monthly;
}

export async function seedDefaultServicesAction(slug: string): Promise<ActionResult<{ count: number }>> {
  const ctx = await requireCompanyContext({ slug, minRole: "supervisor" });
  const supabase = await createClient();

  const { count } = await supabase
    .from("services")
    .select("id", { count: "exact", head: true })
    .eq("company_id", ctx.company.id);

  if ((count ?? 0) > 0) return { success: true, data: { count: 0 } };

  const rows = DEFAULT_SERVICES.map((s, i) => ({
    company_id: ctx.company.id,
    name: s.name,
    description: s.description ?? null,
    estimated_duration_minutes: s.estimatedDurationMinutes,
    frequency: s.frequency ?? null,
    color: s.color,
    default_checklist: s.defaultChecklist,
    legacy_service_type: s.legacyServiceType,
    sort_order: i,
  }));

  const { error } = await supabase.from("services").insert(rows);
  if (error) return { success: false, error: error.message };

  revalidateOperations(slug);
  return { success: true, data: { count: rows.length } };
}

export async function createServiceAction(
  slug: string,
  input: CreateServiceInput,
): Promise<ActionResult<{ id: string }>> {
  const ctx = await requireCompanyContext({ slug, minRole: "supervisor" });
  const parsed = createServiceSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("services")
    .insert({
      company_id: ctx.company.id,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      estimated_duration_minutes: parsed.data.estimatedDurationMinutes,
      frequency: parsed.data.frequency ?? null,
      color: parsed.data.color,
      default_checklist: parsed.data.defaultChecklist,
      legacy_service_type: parsed.data.legacyServiceType ?? null,
      is_active: parsed.data.isActive,
    })
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };
  revalidateOperations(slug);
  return { success: true, data: { id: data.id } };
}

export async function createTeamAction(
  slug: string,
  input: CreateTeamInput,
): Promise<ActionResult<{ id: string }>> {
  const ctx = await requireCompanyContext({ slug, minRole: "supervisor" });
  const parsed = createTeamSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("teams")
    .insert({
      company_id: ctx.company.id,
      name: parsed.data.name,
      supervisor_id: parsed.data.supervisorId ?? null,
      vehicle_info: parsed.data.vehicleInfo ?? null,
      is_active: parsed.data.isActive,
    })
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };

  if (parsed.data.memberIds.length) {
    await supabase.from("team_members").insert(
      parsed.data.memberIds.map((employeeId) => ({
        company_id: ctx.company.id,
        team_id: data.id,
        employee_id: employeeId,
      })),
    );
  }

  revalidateOperations(slug);
  return { success: true, data: { id: data.id } };
}

export async function approveExecutionAction(
  slug: string,
  taskId: string,
): Promise<ActionResult> {
  const ctx = await requireCompanyContext({ slug, minRole: "supervisor" });
  const supabase = await createClient();

  const { error } = await supabase
    .from("tasks")
    .update({ approved_at: new Date().toISOString(), approved_by: ctx.profile.id })
    .eq("id", taskId)
    .eq("company_id", ctx.company.id);

  if (error) return { success: false, error: error.message };

  const { data: task } = await supabase
    .from("tasks")
    .select("id, title, service_type, contract_id, address_id")
    .eq("id", taskId)
    .eq("company_id", ctx.company.id)
    .single();

  await logTaskEvent(supabase, {
    companyId: ctx.company.id,
    taskId,
    eventType: "approved",
    createdBy: ctx.profile.id,
  });

  void emitAutomationEvent({
    companyId: ctx.company.id,
    slug,
    trigger: "service.approved",
    payload: {
      taskId,
      taskTitle: task?.title,
      serviceType: task?.service_type,
      contractId: task?.contract_id,
      addressId: task?.address_id,
      entityType: "task",
      entityId: taskId,
    },
  }).catch(() => undefined);

  void emitAutomationEvent({
    companyId: ctx.company.id,
    slug,
    trigger: "service.completed",
    payload: {
      taskId,
      taskTitle: task?.title,
      serviceType: task?.service_type,
      hasContract: Boolean(task?.contract_id),
      contractId: task?.contract_id,
      addressId: task?.address_id,
      entityType: "task",
      entityId: taskId,
    },
  }).catch(() => undefined);

  revalidateOperations(slug);
  return { success: true, data: undefined };
}

export async function rescheduleTaskAction(
  slug: string,
  taskId: string,
  scheduledDate: string,
): Promise<ActionResult> {
  const ctx = await requireCompanyContext({ slug, minRole: "supervisor" });
  const supabase = await createClient();

  const { error } = await supabase
    .from("tasks")
    .update({ scheduled_date: scheduledDate, status: "scheduled" })
    .eq("id", taskId)
    .eq("company_id", ctx.company.id);

  if (error) return { success: false, error: error.message };

  await logTaskEvent(supabase, {
    companyId: ctx.company.id,
    taskId,
    eventType: "rescheduled",
    createdBy: ctx.profile.id,
    metadata: { scheduledDate },
  });

  revalidateOperations(slug);
  return { success: true, data: undefined };
}

export async function generateTasksFromContractAction(
  slug: string,
  contractId: string,
): Promise<ActionResult<{ count: number }>> {
  const ctx = await requireCompanyContext({ slug, minRole: "supervisor" });
  const supabase = await createClient();

  const { data: contract } = await supabase
    .from("contracts")
    .select("id, title, client_id, address_id, frequency, start_date, end_date, status, is_active, service_description")
    .eq("id", contractId)
    .eq("company_id", ctx.company.id)
    .single();

  if (!contract) return { success: false, error: "Contrato não encontrado" };
  if (!contract.is_active || contract.status !== "active") {
    return { success: false, error: "Contrato inativo" };
  }
  if (!contract.address_id) {
    return { success: false, error: "Contrato sem imóvel vinculado" };
  }

  const { data: existing } = await supabase
    .from("tasks")
    .select("id")
    .eq("contract_id", contractId)
    .gte("scheduled_date", new Date().toISOString().slice(0, 10))
    .limit(1);

  if (existing?.length) {
    return { success: true, data: { count: 0 } };
  }

  const { data: services } = await supabase
    .from("services")
    .select("id, legacy_service_type, default_checklist")
    .eq("company_id", ctx.company.id)
    .eq("is_active", true)
    .order("sort_order")
    .limit(1);

  const service = services?.[0];
  const serviceType = (service?.legacy_service_type ?? "treppenhausreinigung") as ServiceType;
  const rule = contractFrequencyToRule(contract.frequency);
  const baseDate = contract.start_date >= new Date().toISOString().slice(0, 10)
    ? contract.start_date
    : new Date().toISOString().slice(0, 10);

  const dates = [baseDate, ...generateOccurrenceDates(baseDate, rule, rule.occurrences ?? 6)];
  const filteredDates = contract.end_date
    ? dates.filter((d) => d <= contract.end_date!)
    : dates;

  const rows = filteredDates.map((date) => ({
    company_id: ctx.company.id,
    address_id: contract.address_id,
    contract_id: contract.id,
    service_id: service?.id ?? null,
    created_by: ctx.profile.id,
    service_type: serviceType,
    title: contract.title,
    description: contract.service_description ?? null,
    scheduled_date: date,
    status: "scheduled" as const,
    priority: "normal" as const,
  }));

  const { data: inserted, error } = await supabase.from("tasks").insert(rows).select("id");
  if (error) return { success: false, error: error.message };

  for (const task of inserted ?? []) {
    await logTaskEvent(supabase, {
      companyId: ctx.company.id,
      taskId: task.id,
      eventType: "created",
      createdBy: ctx.profile.id,
      message: "Gerado automaticamente a partir do contrato",
      metadata: { contractId },
    });
  }

  revalidateOperations(slug);
  revalidatePath(`/${slug}/finance/contracts/${contractId}`);
  return { success: true, data: { count: inserted?.length ?? 0 } };
}
