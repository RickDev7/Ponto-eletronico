"use server";

import { revalidatePath } from "next/cache";
import { requireCompanyContext } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/actions/auth/actions";
import {
  assignDriverSchema,
  assignVehicleToShiftSchema,
  completeVehicleMaintenanceSchema,
  createVehicleMaintenanceSchema,
  createVehicleSchema,
  endVehicleUsageSchema,
  logVehicleUsageSchema,
  type AssignDriverInput,
  type AssignVehicleToShiftInput,
  type CompleteVehicleMaintenanceInput,
  type CreateVehicleInput,
  type CreateVehicleMaintenanceInput,
  type EndVehicleUsageInput,
  type LogVehicleUsageInput,
} from "@/lib/validations/vehicles";

function vehiclePaths(slug: string) {
  return [
    `/${slug}/workforce/vehicles`,
    `/${slug}/workforce/planning`,
    `/${slug}/workforce`,
  ];
}

function revalidateVehicles(slug: string) {
  for (const path of vehiclePaths(slug)) {
    revalidatePath(path);
  }
  revalidatePath(`/${slug}/workforce`, "layout");
  revalidatePath(`/${slug}/operations/scheduling`);
}

export async function createVehicleAction(
  slug: string,
  input: CreateVehicleInput,
): Promise<ActionResult<{ id: string }>> {
  const ctx = await requireCompanyContext({ slug, minRole: "supervisor" });
  const parsed = createVehicleSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vehicles")
    .insert({
      company_id: ctx.company.id,
      name: parsed.data.name,
      plate_number: parsed.data.plateNumber || null,
      vin: parsed.data.vin || null,
      make: parsed.data.make || null,
      model: parsed.data.model || null,
      year: parsed.data.year ?? null,
      color: parsed.data.color || null,
      fuel_type: parsed.data.fuelType,
      odometer_km: parsed.data.odometerKm ?? 0,
      default_driver_id: parsed.data.defaultDriverId ?? null,
      team_id: parsed.data.teamId ?? null,
      insurance_until: parsed.data.insuranceUntil || null,
      inspection_until: parsed.data.inspectionUntil || null,
      notes: parsed.data.notes || null,
    })
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };
  revalidateVehicles(slug);
  return { success: true, data: { id: data.id } };
}

export async function deleteVehicleAction(slug: string, vehicleId: string): Promise<ActionResult> {
  const ctx = await requireCompanyContext({ slug, minRole: "supervisor" });
  const supabase = await createClient();
  const { error } = await supabase
    .from("vehicles")
    .delete()
    .eq("id", vehicleId)
    .eq("company_id", ctx.company.id);
  if (error) return { success: false, error: error.message };
  revalidateVehicles(slug);
  return { success: true, data: undefined };
}

export async function assignDriverAction(
  slug: string,
  input: AssignDriverInput,
): Promise<ActionResult> {
  const ctx = await requireCompanyContext({ slug, minRole: "supervisor" });
  const parsed = assignDriverSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  }

  const supabase = await createClient();

  if (parsed.data.isPrimary) {
    await supabase
      .from("vehicle_drivers")
      .update({ is_primary: false })
      .eq("vehicle_id", parsed.data.vehicleId)
      .eq("company_id", ctx.company.id)
      .is("ended_at", null);
  }

  const { error } = await supabase.from("vehicle_drivers").insert({
    company_id: ctx.company.id,
    vehicle_id: parsed.data.vehicleId,
    employee_id: parsed.data.employeeId,
    is_primary: parsed.data.isPrimary ?? false,
    license_number: parsed.data.licenseNumber || null,
    license_expires: parsed.data.licenseExpires || null,
    notes: parsed.data.notes || null,
    assigned_by: ctx.profile.id,
  });

  if (error) return { success: false, error: error.message };

  if (parsed.data.isPrimary) {
    await supabase
      .from("vehicles")
      .update({ default_driver_id: parsed.data.employeeId })
      .eq("id", parsed.data.vehicleId);
  }

  revalidateVehicles(slug);
  return { success: true, data: undefined };
}

export async function endDriverAssignmentAction(
  slug: string,
  driverAssignmentId: string,
): Promise<ActionResult> {
  const ctx = await requireCompanyContext({ slug, minRole: "supervisor" });
  const supabase = await createClient();
  const { error } = await supabase
    .from("vehicle_drivers")
    .update({ ended_at: new Date().toISOString() })
    .eq("id", driverAssignmentId)
    .eq("company_id", ctx.company.id)
    .is("ended_at", null);
  if (error) return { success: false, error: error.message };
  revalidateVehicles(slug);
  return { success: true, data: undefined };
}

export async function createVehicleMaintenanceAction(
  slug: string,
  input: CreateVehicleMaintenanceInput,
): Promise<ActionResult> {
  const ctx = await requireCompanyContext({ slug, minRole: "supervisor" });
  const parsed = createVehicleMaintenanceSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("vehicle_maintenance").insert({
    company_id: ctx.company.id,
    vehicle_id: parsed.data.vehicleId,
    maintenance_type: parsed.data.maintenanceType,
    title: parsed.data.title,
    description: parsed.data.description || null,
    scheduled_date: parsed.data.scheduledDate || null,
    odometer_km: parsed.data.odometerKm ?? null,
    cost_cents: parsed.data.costCents ?? null,
    vendor: parsed.data.vendor || null,
    next_due_date: parsed.data.nextDueDate || null,
    next_due_odometer_km: parsed.data.nextDueOdometerKm ?? null,
    status: "scheduled",
  });

  if (error) return { success: false, error: error.message };

  await supabase
    .from("vehicles")
    .update({ status: "maintenance" })
    .eq("id", parsed.data.vehicleId);

  revalidateVehicles(slug);
  return { success: true, data: undefined };
}

export async function completeVehicleMaintenanceAction(
  slug: string,
  input: CompleteVehicleMaintenanceInput,
): Promise<ActionResult> {
  const ctx = await requireCompanyContext({ slug, minRole: "supervisor" });
  const parsed = completeVehicleMaintenanceSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  }

  const supabase = await createClient();
  const { data: record, error } = await supabase
    .from("vehicle_maintenance")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      cost_cents: parsed.data.costCents ?? undefined,
      vendor: parsed.data.vendor ?? undefined,
      odometer_km: parsed.data.odometerKm ?? undefined,
      next_due_date: parsed.data.nextDueDate ?? undefined,
      next_due_odometer_km: parsed.data.nextDueOdometerKm ?? undefined,
      performed_by: ctx.profile.id,
    })
    .eq("id", parsed.data.maintenanceId)
    .eq("company_id", ctx.company.id)
    .select("vehicle_id, odometer_km")
    .single();

  if (error || !record) return { success: false, error: error?.message ?? "Not found" };

  const vehicleUpdate: Record<string, unknown> = { status: "available" };
  if (parsed.data.odometerKm !== undefined) {
    vehicleUpdate.odometer_km = parsed.data.odometerKm;
  } else if (record.odometer_km) {
    vehicleUpdate.odometer_km = record.odometer_km;
  }

  await supabase.from("vehicles").update(vehicleUpdate).eq("id", record.vehicle_id);

  revalidateVehicles(slug);
  return { success: true, data: undefined };
}

export async function logVehicleUsageAction(
  slug: string,
  input: LogVehicleUsageInput,
): Promise<ActionResult<{ id: string }>> {
  const ctx = await requireCompanyContext({ slug, minRole: "supervisor" });
  const parsed = logVehicleUsageSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  }

  const supabase = await createClient();
  const { data: vehicle } = await supabase
    .from("vehicles")
    .select("id, status, odometer_km")
    .eq("id", parsed.data.vehicleId)
    .eq("company_id", ctx.company.id)
    .single();

  if (!vehicle) return { success: false, error: "Vehicle not found" };
  if (vehicle.status === "maintenance" || vehicle.status === "retired") {
    return { success: false, error: "Vehicle not available" };
  }

  const { data, error } = await supabase
    .from("vehicle_usage")
    .insert({
      company_id: ctx.company.id,
      vehicle_id: parsed.data.vehicleId,
      employee_id: parsed.data.employeeId ?? null,
      task_id: parsed.data.taskId ?? null,
      purpose: parsed.data.purpose,
      odometer_start: parsed.data.odometerStart ?? vehicle.odometer_km ?? null,
      notes: parsed.data.notes || null,
      created_by: ctx.profile.id,
    })
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };

  await supabase
    .from("vehicles")
    .update({ status: "assigned" })
    .eq("id", parsed.data.vehicleId);

  revalidateVehicles(slug);
  return { success: true, data: { id: data.id } };
}

export async function endVehicleUsageAction(
  slug: string,
  input: EndVehicleUsageInput,
): Promise<ActionResult> {
  const ctx = await requireCompanyContext({ slug, minRole: "supervisor" });
  const parsed = endVehicleUsageSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  }

  const supabase = await createClient();
  const { data: usage, error } = await supabase
    .from("vehicle_usage")
    .update({
      ended_at: new Date().toISOString(),
      odometer_end: parsed.data.odometerEnd ?? undefined,
      distance_km: parsed.data.distanceKm ?? undefined,
      notes: parsed.data.notes ?? undefined,
    })
    .eq("id", parsed.data.usageId)
    .eq("company_id", ctx.company.id)
    .is("ended_at", null)
    .select("vehicle_id, odometer_end, distance_km, odometer_start")
    .single();

  if (error || !usage) return { success: false, error: error?.message ?? "Usage not found" };

  const odometerEnd =
    parsed.data.odometerEnd ??
    usage.odometer_end ??
    (usage.odometer_start && parsed.data.distanceKm
      ? Number(usage.odometer_start) + parsed.data.distanceKm
      : null);

  if (odometerEnd !== null) {
    await supabase
      .from("vehicles")
      .update({ odometer_km: odometerEnd, status: "available" })
      .eq("id", usage.vehicle_id);
  } else {
    const { count } = await supabase
      .from("vehicle_usage")
      .select("id", { count: "exact", head: true })
      .eq("vehicle_id", usage.vehicle_id)
      .is("ended_at", null);

    if ((count ?? 0) === 0) {
      await supabase
        .from("vehicles")
        .update({ status: "available" })
        .eq("id", usage.vehicle_id);
    }
  }

  revalidateVehicles(slug);
  return { success: true, data: undefined };
}

export async function assignVehicleToShiftAction(
  slug: string,
  input: AssignVehicleToShiftInput,
): Promise<ActionResult> {
  const ctx = await requireCompanyContext({ slug, minRole: "supervisor" });
  const parsed = assignVehicleToShiftSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  }

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("vehicle_usage")
    .select("id")
    .eq("company_id", ctx.company.id)
    .eq("task_id", parsed.data.taskId)
    .is("ended_at", null)
    .maybeSingle();

  if (existing) {
    await endVehicleUsageAction(slug, { usageId: existing.id });
  }

  const result = await logVehicleUsageAction(slug, {
    vehicleId: parsed.data.vehicleId,
    employeeId: parsed.data.employeeId ?? null,
    taskId: parsed.data.taskId,
    purpose: "shift",
  });

  if (!result.success) return result;
  return { success: true, data: undefined };
}

export async function removeVehicleFromShiftAction(
  slug: string,
  usageId: string,
): Promise<ActionResult> {
  return endVehicleUsageAction(slug, { usageId });
}
