"use server";

import { revalidatePath } from "next/cache";
import { requireCompanyContext } from "@/lib/auth/guards";
import { enforcePlanLimit } from "@/lib/billing/enforcement";
import { createClient } from "@/lib/supabase/server";
import { logTaskEvent } from "@/lib/operations/task-events";
import { createTaskSchema, type CreateTaskInput } from "@/lib/validations/tasks";
import { generateOccurrenceDates, type RecurrenceRule } from "@/lib/recurring/generator";
import type { ActionResult } from "@/actions/auth/actions";
import type { TaskStatus, ServiceType, TaskPriority } from "@/types";

export async function createTask(
  slug: string,
  input: CreateTaskInput,
): Promise<ActionResult<{ id: string }>> {
  const ctx = await requireCompanyContext({ slug, minRole: "supervisor" });
  const parsed = createTaskSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid" };

  const limitCheck = await enforcePlanLimit(ctx.company.id, "tasksPerMonth", 1);
  if (!limitCheck.allowed) {
    return { success: false, error: limitCheck.error };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .insert({
      company_id: ctx.company.id,
      address_id: parsed.data.addressId,
      created_by: ctx.profile.id,
      service_type: parsed.data.serviceType as ServiceType,
      title: parsed.data.title,
      description: parsed.data.description || null,
      scheduled_date: parsed.data.scheduledDate,
      scheduled_start: parsed.data.scheduledStart || null,
      scheduled_end: parsed.data.scheduledEnd || null,
      priority: parsed.data.priority as TaskPriority,
      status: "scheduled",
    })
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };

  await logTaskEvent(supabase, {
    companyId: ctx.company.id,
    taskId: data.id,
    eventType: "created",
    createdBy: ctx.profile.id,
    message: "Visita criada manualmente",
  });

  if (parsed.data.employeeIds?.length) {
    await supabase.from("task_assignments").insert(
      parsed.data.employeeIds.map((empId) => ({
        task_id: data.id,
        employee_id: empId,
        assigned_by: ctx.profile.id,
      })),
    );
  }

  revalidatePath(`/${slug}/tasks`);
  revalidatePath(`/${slug}/calendar`);
  revalidatePath(`/${slug}`);
  return { success: true, data: { id: data.id } };
}

export async function createRecurringTasks(
  slug: string,
  input: CreateTaskInput & { recurrenceRule: RecurrenceRule },
): Promise<ActionResult<{ count: number }>> {
  const ctx = await requireCompanyContext({ slug, minRole: "supervisor" });
  const parsed = createTaskSchema.safeParse(input);
  if (!parsed.success)
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid" };

  const { recurrenceRule } = input;
  const supabase = await createClient();

  const futureDates = generateOccurrenceDates(
    parsed.data.scheduledDate,
    recurrenceRule,
    recurrenceRule.occurrences ?? 11,
  );
  const totalNewTasks = 1 + futureDates.length;

  const limitCheck = await enforcePlanLimit(
    ctx.company.id,
    "tasksPerMonth",
    totalNewTasks,
  );
  if (!limitCheck.allowed) {
    return { success: false, error: limitCheck.error };
  }

  const basePayload = {
    company_id: ctx.company.id,
    address_id: parsed.data.addressId,
    created_by: ctx.profile.id,
    service_type: parsed.data.serviceType as ServiceType,
    title: parsed.data.title,
    description: parsed.data.description || null,
    scheduled_start: parsed.data.scheduledStart || null,
    scheduled_end: parsed.data.scheduledEnd || null,
    priority: parsed.data.priority as TaskPriority,
    status: "scheduled" as const,
  };

  // Create the root task (index 0)
  const { data: root, error: rootErr } = await supabase
    .from("tasks")
    .insert({
      ...basePayload,
      scheduled_date: parsed.data.scheduledDate,
      recurrence_rule: recurrenceRule as unknown as Record<string, unknown>,
      recurrence_index: 0,
    })
    .select("id")
    .single();

  if (rootErr) return { success: false, error: rootErr.message };

  if (futureDates.length > 0) {
    const instances = futureDates.map((date, idx) => ({
      ...basePayload,
      scheduled_date: date,
      parent_task_id: root.id,
      recurrence_rule: recurrenceRule as unknown as Record<string, unknown>,
      recurrence_index: idx + 1,
    }));

    const { error: instErr } = await supabase.from("tasks").insert(instances);
    if (instErr) return { success: false, error: instErr.message };

    // Assign employees to all instances if provided
    if (parsed.data.employeeIds?.length) {
      const { data: allInstances } = await supabase
        .from("tasks")
        .select("id")
        .eq("parent_task_id", root.id);

      const allIds = [root.id, ...(allInstances ?? []).map((t) => t.id)];
      const assignments = allIds.flatMap((taskId) =>
        (parsed.data.employeeIds ?? []).map((empId) => ({
          task_id: taskId,
          employee_id: empId,
          assigned_by: ctx.profile.id,
        })),
      );
      await supabase.from("task_assignments").insert(assignments);
    }
  } else if (parsed.data.employeeIds?.length) {
    await supabase.from("task_assignments").insert(
      parsed.data.employeeIds.map((empId) => ({
        task_id: root.id,
        employee_id: empId,
        assigned_by: ctx.profile.id,
      })),
    );
  }

  revalidatePath(`/${slug}/tasks`);
  revalidatePath(`/${slug}/calendar`);
  revalidatePath(`/${slug}`);
  return { success: true, data: { count: futureDates.length + 1 } };
}

export async function cancelRecurringSeries(
  slug: string,
  rootId: string,
): Promise<ActionResult<{ cancelled: number }>> {
  const ctx = await requireCompanyContext({ slug, minRole: "supervisor" });
  const supabase = await createClient();

  const { data: tasks, error: fetchErr } = await supabase
    .from("tasks")
    .select("id, status")
    .eq("company_id", ctx.company.id)
    .or(`id.eq.${rootId},parent_task_id.eq.${rootId}`)
    .in("status", ["draft", "scheduled", "in_progress"]);

  if (fetchErr) return { success: false, error: fetchErr.message };
  if (!tasks?.length) return { success: true, data: { cancelled: 0 } };

  const ids = tasks.map((t) => t.id);
  const { error } = await supabase
    .from("tasks")
    .update({ status: "cancelled" })
    .in("id", ids);

  if (error) return { success: false, error: error.message };

  revalidatePath(`/${slug}/tasks`);
  revalidatePath(`/${slug}/tasks/series`);
  revalidatePath(`/${slug}/calendar`);
  return { success: true, data: { cancelled: ids.length } };
}

export async function updateTaskStatus(
  slug: string,
  taskId: string,
  status: TaskStatus,
): Promise<ActionResult> {
  const ctx = await requireCompanyContext({ slug });
  const supabase = await createClient();
  const { error } = await supabase
    .from("tasks")
    .update({ status })
    .eq("id", taskId)
    .eq("company_id", ctx.company.id);

  if (error) return { success: false, error: error.message };

  await logTaskEvent(supabase, {
    companyId: ctx.company.id,
    taskId,
    eventType: "status_changed",
    createdBy: ctx.profile.id,
    message: status,
    metadata: { status },
  });

  if (status === "completed") {
    await logTaskEvent(supabase, {
      companyId: ctx.company.id,
      taskId,
      eventType: "completed",
      createdBy: ctx.profile.id,
    });
  }

  revalidatePath(`/${slug}/tasks`);
  revalidatePath(`/${slug}/operations`);
  revalidatePath(`/${slug}/operations/visits`);
  revalidatePath(`/${slug}/operations/work-orders`);
  revalidatePath(`/${slug}`);
  return { success: true, data: undefined };
}

export async function deleteTask(
  slug: string,
  taskId: string,
): Promise<ActionResult> {
  const ctx = await requireCompanyContext({ slug, minRole: "admin" });
  const supabase = await createClient();
  const { error } = await supabase
    .from("tasks")
    .update({ status: "cancelled" })
    .eq("id", taskId)
    .eq("company_id", ctx.company.id);

  if (error) return { success: false, error: error.message };
  revalidatePath(`/${slug}/tasks`);
  return { success: true, data: undefined };
}

export async function duplicateTask(
  slug: string,
  taskId: string,
): Promise<ActionResult<{ id: string }>> {
  const ctx = await requireCompanyContext({ slug, minRole: "supervisor" });
  const supabase = await createClient();

  const { data: source, error: fetchErr } = await supabase
    .from("tasks")
    .select("title, service_type, description, address_id, priority, scheduled_date, scheduled_start, scheduled_end")
    .eq("id", taskId)
    .eq("company_id", ctx.company.id)
    .single();

  if (fetchErr || !source) return { success: false, error: "Aufgabe nicht gefunden" };

  const { data, error } = await supabase
    .from("tasks")
    .insert({
      company_id: ctx.company.id,
      address_id: source.address_id,
      created_by: ctx.profile.id,
      service_type: source.service_type as ServiceType,
      title: `Kopie von ${source.title}`,
      description: source.description || null,
      scheduled_date: source.scheduled_date,
      scheduled_start: source.scheduled_start || null,
      scheduled_end: source.scheduled_end || null,
      priority: source.priority as TaskPriority,
      status: "draft" as TaskStatus,
    })
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };
  revalidatePath(`/${slug}/tasks`);
  return { success: true, data: { id: data.id } };
}

export async function bulkUpdateTasks(
  slug: string,
  taskIds: string[],
  action: "complete" | "cancel" | "schedule",
): Promise<ActionResult<{ updated: number }>> {
  if (!taskIds.length) return { success: false, error: "Keine Aufgaben ausgewählt" };
  if (taskIds.length > 100) return { success: false, error: "Maximal 100 Aufgaben gleichzeitig" };

  const ctx = await requireCompanyContext({ slug, minRole: "supervisor" });
  const supabase = await createClient();

  const statusMap: Record<typeof action, TaskStatus> = {
    complete: "completed",
    cancel: "cancelled",
    schedule: "scheduled",
  };

  const { data, error } = await supabase
    .from("tasks")
    .update({ status: statusMap[action] })
    .in("id", taskIds)
    .eq("company_id", ctx.company.id)
    .select("id");

  if (error) return { success: false, error: error.message };

  revalidatePath(`/${slug}/tasks`);
  revalidatePath(`/${slug}`);
  return { success: true, data: { updated: data?.length ?? 0 } };
}
