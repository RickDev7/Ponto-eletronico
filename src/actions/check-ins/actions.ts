"use server";

import { revalidatePath } from "next/cache";
import { requireCompanyContext } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/actions/auth/actions";
import { recordTimeAccountFromCheckIn } from "@/actions/workforce/actions";
import { logTaskEvent } from "@/lib/operations/task-events";
import { generateServiceReport } from "@/lib/field-execution/generate-service-report";

function haversineMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
) {
  const R = 6_371_000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function checkIn(
  slug: string,
  taskId: string,
  opts?: { latitude?: number; longitude?: number; notes?: string },
): Promise<ActionResult<{ checkInId: string }>> {
  const ctx = await requireCompanyContext({ slug });

  if (!ctx.employee) {
    return { success: false, error: "Kein Mitarbeiterdatensatz gefunden" };
  }

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("check_ins")
    .select("id")
    .eq("employee_id", ctx.employee.id)
    .is("check_out_at", null)
    .maybeSingle();

  if (existing) {
    return { success: false, error: "Sie sind bereits eingecheckt. Bitte zuerst auschecken." };
  }

  const { data: taskAddress } = await supabase
    .from("tasks")
    .select("address:addresses(latitude, longitude)")
    .eq("id", taskId)
    .eq("company_id", ctx.company.id)
    .maybeSingle();

  const address = Array.isArray(taskAddress?.address)
    ? taskAddress.address[0]
    : taskAddress?.address;
  const addressLat = address?.latitude as number | null | undefined;
  const addressLng = address?.longitude as number | null | undefined;

  // If company mapped this service address, require and validate field GPS.
  if (addressLat != null && addressLng != null) {
    if (opts?.latitude == null || opts?.longitude == null) {
      return { success: false, error: "Standortzugriff erforderlich für Check-in." };
    }

    const distance = haversineMeters(
      opts.latitude,
      opts.longitude,
      addressLat,
      addressLng,
    );

    if (distance > 1000) {
      return {
        success: false,
        error: "Zu weit vom Einsatzort entfernt (über 1 km).",
      };
    }
  }

  const { data, error } = await supabase
    .from("check_ins")
    .insert({
      company_id: ctx.company.id,
      task_id: taskId,
      employee_id: ctx.employee.id,
      check_in_latitude: opts?.latitude ?? null,
      check_in_longitude: opts?.longitude ?? null,
      check_in_notes: opts?.notes ?? null,
    })
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };

  await supabase
    .from("tasks")
    .update({ status: "in_progress" })
    .eq("id", taskId)
    .eq("company_id", ctx.company.id)
    .neq("status", "completed");

  await logTaskEvent(supabase, {
    companyId: ctx.company.id,
    taskId,
    eventType: "check_in",
    createdBy: ctx.profile.id,
    message: opts?.notes ?? undefined,
    metadata: { checkInId: data.id, latitude: opts?.latitude, longitude: opts?.longitude },
  });

  revalidatePath(`/${slug}/tasks`);
  revalidatePath(`/${slug}/tasks/${taskId}`);
  revalidatePath(`/${slug}/field/schedule`);
  revalidatePath(`/${slug}/field/tasks/${taskId}`);
  revalidatePath(`/${slug}/minha-area`);
  revalidatePath(`/${slug}`);
  return { success: true, data: { checkInId: data.id } };
}

export async function checkOut(
  slug: string,
  checkInId: string,
  opts?: {
    latitude?: number;
    longitude?: number;
    notes?: string;
    breakMinutes?: number;
    travelMinutes?: number;
  },
): Promise<ActionResult> {
  const ctx = await requireCompanyContext({ slug });
  if (!ctx.employee) return { success: false, error: "Kein Mitarbeiterdatensatz" };

  const supabase = await createClient();
  const { data: checkInRow, error } = await supabase
    .from("check_ins")
    .update({
      check_out_at: new Date().toISOString(),
      check_out_latitude: opts?.latitude ?? null,
      check_out_longitude: opts?.longitude ?? null,
      check_out_notes: opts?.notes ?? null,
      break_minutes_actual: opts?.breakMinutes ?? 0,
      travel_minutes_actual: opts?.travelMinutes ?? 0,
    })
    .eq("id", checkInId)
    .eq("employee_id", ctx.employee.id)
    .select("id, task_id, check_in_at, check_out_at, employee_id")
    .single();

  if (error) return { success: false, error: error.message };

  if (checkInRow?.check_out_at) {
    await recordTimeAccountFromCheckIn(
      ctx.company.id,
      checkInRow.id,
      checkInRow.employee_id,
      checkInRow.check_in_at,
      checkInRow.check_out_at,
    );
  }

  if (checkInRow?.task_id) {
    await logTaskEvent(supabase, {
      companyId: ctx.company.id,
      taskId: checkInRow.task_id as string,
      eventType: "check_out",
      createdBy: ctx.profile.id,
      message: opts?.notes ?? undefined,
      metadata: { checkInId },
    });

    await generateServiceReport(ctx.company.id, checkInRow.task_id as string, checkInId);
  }

  revalidatePath(`/${slug}/tasks`);
  if (checkInRow?.task_id) {
    revalidatePath(`/${slug}/tasks/${checkInRow.task_id}`);
    revalidatePath(`/${slug}/field/tasks/${checkInRow.task_id}`);
  }
  revalidatePath(`/${slug}/field/schedule`);
  revalidatePath(`/${slug}/minha-area`);
  revalidatePath(`/${slug}`);
  revalidatePath(`/${slug}/workforce/time-account`);
  revalidatePath(`/${slug}/workforce/timesheets`);
  revalidatePath(`/${slug}/workforce/time-tracking`);
  return { success: true, data: undefined };
}
