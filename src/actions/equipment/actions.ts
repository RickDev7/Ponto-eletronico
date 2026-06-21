"use server";

import { revalidatePath } from "next/cache";
import { requireCompanyContext } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/actions/auth/actions";
import type { EquipmentEventType } from "@/lib/equipment/equipment-data";
import {
  assignEquipmentSchema,
  completeMaintenanceSchema,
  createEquipmentSchema,
  createMaintenanceSchema,
  updateEquipmentSchema,
  type AssignEquipmentInput,
  type CompleteMaintenanceInput,
  type CreateEquipmentInput,
  type CreateMaintenanceInput,
  type UpdateEquipmentInput,
} from "@/lib/validations/equipment";

function equipmentPaths(slug: string) {
  return [`/${slug}/operations`, `/${slug}/operations/equipment`];
}

function revalidateEquipment(slug: string) {
  for (const path of equipmentPaths(slug)) {
    revalidatePath(path);
  }
  revalidatePath(`/${slug}/operations`, "layout");
}

async function logEquipmentHistory(
  companyId: string,
  equipmentId: string,
  eventType: EquipmentEventType,
  message: string,
  createdBy: string,
  metadata: Record<string, unknown> = {},
) {
  const supabase = await createClient();
  await supabase.from("equipment_history").insert({
    company_id: companyId,
    equipment_id: equipmentId,
    event_type: eventType,
    message,
    metadata,
    created_by: createdBy,
  });
}

export async function createEquipmentAction(
  slug: string,
  input: CreateEquipmentInput,
): Promise<ActionResult<{ id: string }>> {
  const ctx = await requireCompanyContext({ slug, minRole: "supervisor" });
  const parsed = createEquipmentSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("equipment")
    .insert({
      company_id: ctx.company.id,
      name: parsed.data.name,
      description: parsed.data.description || null,
      category: parsed.data.category,
      status: parsed.data.status ?? "available",
      serial_number: parsed.data.serialNumber || null,
      asset_tag: parsed.data.assetTag || null,
      manufacturer: parsed.data.manufacturer || null,
      model: parsed.data.model || null,
      purchase_date: parsed.data.purchaseDate || null,
      purchase_cost_cents: parsed.data.purchaseCostCents ?? null,
      warranty_until: parsed.data.warrantyUntil || null,
      service_id: parsed.data.serviceId ?? null,
      default_employee_id: parsed.data.defaultEmployeeId ?? null,
      location_notes: parsed.data.locationNotes || null,
    })
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };

  await logEquipmentHistory(
    ctx.company.id,
    data.id,
    "created",
    `Equipment "${parsed.data.name}" registered`,
    ctx.profile.id,
  );

  revalidateEquipment(slug);
  return { success: true, data: { id: data.id } };
}

export async function updateEquipmentAction(
  slug: string,
  equipmentId: string,
  input: UpdateEquipmentInput,
): Promise<ActionResult> {
  const ctx = await requireCompanyContext({ slug, minRole: "supervisor" });
  const parsed = updateEquipmentSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  }

  const supabase = await createClient();
  const update: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) update.name = parsed.data.name;
  if (parsed.data.description !== undefined) update.description = parsed.data.description || null;
  if (parsed.data.category !== undefined) update.category = parsed.data.category;
  if (parsed.data.status !== undefined) update.status = parsed.data.status;
  if (parsed.data.serialNumber !== undefined) update.serial_number = parsed.data.serialNumber || null;
  if (parsed.data.assetTag !== undefined) update.asset_tag = parsed.data.assetTag || null;
  if (parsed.data.manufacturer !== undefined) update.manufacturer = parsed.data.manufacturer || null;
  if (parsed.data.model !== undefined) update.model = parsed.data.model || null;
  if (parsed.data.purchaseDate !== undefined) update.purchase_date = parsed.data.purchaseDate || null;
  if (parsed.data.purchaseCostCents !== undefined) update.purchase_cost_cents = parsed.data.purchaseCostCents ?? null;
  if (parsed.data.warrantyUntil !== undefined) update.warranty_until = parsed.data.warrantyUntil || null;
  if (parsed.data.serviceId !== undefined) update.service_id = parsed.data.serviceId ?? null;
  if (parsed.data.defaultEmployeeId !== undefined) update.default_employee_id = parsed.data.defaultEmployeeId ?? null;
  if (parsed.data.locationNotes !== undefined) update.location_notes = parsed.data.locationNotes || null;

  const { error } = await supabase
    .from("equipment")
    .update(update)
    .eq("id", equipmentId)
    .eq("company_id", ctx.company.id);

  if (error) return { success: false, error: error.message };

  await logEquipmentHistory(
    ctx.company.id,
    equipmentId,
    "updated",
    "Equipment details updated",
    ctx.profile.id,
    update,
  );

  revalidateEquipment(slug);
  return { success: true, data: undefined };
}

export async function assignEquipmentAction(
  slug: string,
  input: AssignEquipmentInput,
): Promise<ActionResult> {
  const ctx = await requireCompanyContext({ slug, minRole: "supervisor" });
  const parsed = assignEquipmentSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  }

  const supabase = await createClient();

  const { data: equipment } = await supabase
    .from("equipment")
    .select("id, name, status")
    .eq("id", parsed.data.equipmentId)
    .eq("company_id", ctx.company.id)
    .single();

  if (!equipment) return { success: false, error: "Equipment not found" };
  if (equipment.status === "retired") {
    return { success: false, error: "Cannot assign retired equipment" };
  }

  const { error: assignError } = await supabase.from("equipment_assignments").insert({
    company_id: ctx.company.id,
    equipment_id: parsed.data.equipmentId,
    employee_id: parsed.data.employeeId ?? null,
    task_id: parsed.data.taskId ?? null,
    service_id: parsed.data.serviceId ?? null,
    notes: parsed.data.notes || null,
    assigned_by: ctx.profile.id,
  });

  if (assignError) return { success: false, error: assignError.message };

  await supabase
    .from("equipment")
    .update({ status: "assigned" })
    .eq("id", parsed.data.equipmentId);

  await logEquipmentHistory(
    ctx.company.id,
    parsed.data.equipmentId,
    "assigned",
    `Assigned to ${parsed.data.employeeId ? "employee" : "service/task"}`,
    ctx.profile.id,
    {
      employeeId: parsed.data.employeeId,
      taskId: parsed.data.taskId,
      serviceId: parsed.data.serviceId,
    },
  );

  revalidateEquipment(slug);
  return { success: true, data: undefined };
}

export async function returnEquipmentAction(
  slug: string,
  assignmentId: string,
): Promise<ActionResult> {
  const ctx = await requireCompanyContext({ slug, minRole: "supervisor" });
  const supabase = await createClient();

  const { data: assignment, error } = await supabase
    .from("equipment_assignments")
    .update({ returned_at: new Date().toISOString() })
    .eq("id", assignmentId)
    .eq("company_id", ctx.company.id)
    .is("returned_at", null)
    .select("equipment_id")
    .single();

  if (error || !assignment) {
    return { success: false, error: error?.message ?? "Assignment not found" };
  }

  const { count } = await supabase
    .from("equipment_assignments")
    .select("id", { count: "exact", head: true })
    .eq("equipment_id", assignment.equipment_id)
    .is("returned_at", null);

  if ((count ?? 0) === 0) {
    await supabase
      .from("equipment")
      .update({ status: "available" })
      .eq("id", assignment.equipment_id);
  }

  await logEquipmentHistory(
    ctx.company.id,
    assignment.equipment_id,
    "returned",
    "Equipment returned",
    ctx.profile.id,
  );

  revalidateEquipment(slug);
  return { success: true, data: undefined };
}

export async function createMaintenanceAction(
  slug: string,
  input: CreateMaintenanceInput,
): Promise<ActionResult> {
  const ctx = await requireCompanyContext({ slug, minRole: "supervisor" });
  const parsed = createMaintenanceSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("equipment_maintenance")
    .insert({
      company_id: ctx.company.id,
      equipment_id: parsed.data.equipmentId,
      maintenance_type: parsed.data.maintenanceType,
      title: parsed.data.title,
      description: parsed.data.description || null,
      scheduled_date: parsed.data.scheduledDate || null,
      cost_cents: parsed.data.costCents ?? null,
      vendor: parsed.data.vendor || null,
      next_due_date: parsed.data.nextDueDate || null,
      status: "scheduled",
    })
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };

  await supabase
    .from("equipment")
    .update({ status: "maintenance" })
    .eq("id", parsed.data.equipmentId);

  await logEquipmentHistory(
    ctx.company.id,
    parsed.data.equipmentId,
    "maintenance_scheduled",
    `Maintenance scheduled: ${parsed.data.title}`,
    ctx.profile.id,
    { maintenanceId: data.id },
  );

  revalidateEquipment(slug);
  return { success: true, data: undefined };
}

export async function completeMaintenanceAction(
  slug: string,
  input: CompleteMaintenanceInput,
): Promise<ActionResult> {
  const ctx = await requireCompanyContext({ slug, minRole: "supervisor" });
  const parsed = completeMaintenanceSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  }

  const supabase = await createClient();
  const { data: record, error } = await supabase
    .from("equipment_maintenance")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      cost_cents: parsed.data.costCents ?? undefined,
      vendor: parsed.data.vendor ?? undefined,
      next_due_date: parsed.data.nextDueDate ?? undefined,
      performed_by: ctx.profile.id,
    })
    .eq("id", parsed.data.maintenanceId)
    .eq("company_id", ctx.company.id)
    .select("equipment_id, title")
    .single();

  if (error || !record) return { success: false, error: error?.message ?? "Not found" };

  await supabase
    .from("equipment")
    .update({ status: "available" })
    .eq("id", record.equipment_id);

  await logEquipmentHistory(
    ctx.company.id,
    record.equipment_id,
    "maintenance_completed",
    `Maintenance completed: ${record.title}`,
    ctx.profile.id,
    { maintenanceId: parsed.data.maintenanceId },
  );

  revalidateEquipment(slug);
  return { success: true, data: undefined };
}

export async function deleteEquipmentAction(
  slug: string,
  equipmentId: string,
): Promise<ActionResult> {
  const ctx = await requireCompanyContext({ slug, minRole: "supervisor" });
  const supabase = await createClient();

  const { error } = await supabase
    .from("equipment")
    .delete()
    .eq("id", equipmentId)
    .eq("company_id", ctx.company.id);

  if (error) return { success: false, error: error.message };
  revalidateEquipment(slug);
  return { success: true, data: undefined };
}
