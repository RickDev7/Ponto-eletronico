"use server";

import { revalidatePath } from "next/cache";
import { requireEmployeeContext } from "@/lib/auth/guards";
import { revalidateEmployeeMobilePaths } from "@/lib/employee/revalidate-mobile";
import { createClient } from "@/lib/supabase/server";
import {
  employeeVacationRequestSchema,
  type EmployeeVacationRequestInput,
} from "@/lib/validations/employee-vacations";
import type { ActionResult } from "@/actions/auth/actions";

function revalidateVacationPaths(slug: string) {
  revalidatePath(`/${slug}/workforce/vacations`);
  revalidateEmployeeMobilePaths(slug);
  revalidatePath(`/${slug}/mobile/vacations`);
}

export async function requestEmployeeVacationAction(
  slug: string,
  input: EmployeeVacationRequestInput,
): Promise<ActionResult<{ id: string }>> {
  const ctx = await requireEmployeeContext(slug);
  const parsed = employeeVacationRequestSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  }

  const today = new Date().toISOString().slice(0, 10);
  if (parsed.data.startDate < today) {
    return { success: false, error: "A data de início não pode ser no passado" };
  }

  const supabase = await createClient();

  const { data: overlapping } = await supabase
    .from("vacation_requests")
    .select("id")
    .eq("company_id", ctx.company.id)
    .eq("employee_id", ctx.employee.id)
    .in("status", ["pending", "approved"])
    .lte("start_date", parsed.data.endDate)
    .gte("end_date", parsed.data.startDate)
    .limit(1)
    .maybeSingle();

  if (overlapping) {
    return { success: false, error: "Já existe um pedido de férias neste período" };
  }

  const { data, error } = await supabase
    .from("vacation_requests")
    .insert({
      company_id: ctx.company.id,
      employee_id: ctx.employee.id,
      start_date: parsed.data.startDate,
      end_date: parsed.data.endDate,
      notes: parsed.data.notes?.trim() || null,
      status: "pending",
    })
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };

  revalidateVacationPaths(slug);
  return { success: true, data: { id: data.id as string } };
}

export async function cancelEmployeeVacationAction(
  slug: string,
  requestId: string,
): Promise<ActionResult> {
  const ctx = await requireEmployeeContext(slug);
  const supabase = await createClient();

  const { data: request } = await supabase
    .from("vacation_requests")
    .select("id, status, employee_id")
    .eq("id", requestId)
    .eq("company_id", ctx.company.id)
    .single();

  if (!request || request.employee_id !== ctx.employee.id) {
    return { success: false, error: "Pedido não encontrado" };
  }

  if (request.status !== "pending") {
    return { success: false, error: "Só pedidos pendentes podem ser cancelados" };
  }

  const { error } = await supabase
    .from("vacation_requests")
    .update({ status: "cancelled" })
    .eq("id", requestId)
    .eq("employee_id", ctx.employee.id);

  if (error) return { success: false, error: error.message };

  revalidateVacationPaths(slug);
  return { success: true, data: undefined };
}
