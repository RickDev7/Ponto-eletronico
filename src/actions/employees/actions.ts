"use server";

import { revalidatePath } from "next/cache";
import { requireCompanyContext } from "@/lib/auth/guards";
import { enforcePlanLimit } from "@/lib/billing/enforcement";
import { createClient } from "@/lib/supabase/server";
import { createEmployeeSchema, type CreateEmployeeInput } from "@/lib/validations/employees";
import type { ActionResult } from "@/actions/auth/actions";

export async function createEmployee(
  slug: string,
  input: CreateEmployeeInput,
): Promise<ActionResult<{ id: string }>> {
  const ctx = await requireCompanyContext({ slug, minRole: "supervisor" });
  const parsed = createEmployeeSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  }

  const limitCheck = await enforcePlanLimit(ctx.company.id, "employees", 1);
  if (!limitCheck.allowed) {
    return { success: false, error: limitCheck.error };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("employees")
    .insert({
      company_id: ctx.company.id,
      full_name: parsed.data.fullName,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      employee_number: parsed.data.employeeNumber || null,
      hire_date: parsed.data.hireDate || null,
      notes: parsed.data.notes || null,
    })
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };

  revalidatePath(`/${slug}/employees`);
  return { success: true, data: { id: data.id } };
}

export async function updateEmployee(
  slug: string,
  id: string,
  input: CreateEmployeeInput,
): Promise<ActionResult> {
  const ctx = await requireCompanyContext({ slug, minRole: "supervisor" });
  const parsed = createEmployeeSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("employees")
    .update({
      full_name: parsed.data.fullName,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      employee_number: parsed.data.employeeNumber || null,
      hire_date: parsed.data.hireDate || null,
      notes: parsed.data.notes || null,
    })
    .eq("id", id)
    .eq("company_id", ctx.company.id);

  if (error) return { success: false, error: error.message };

  revalidatePath(`/${slug}/employees`);
  return { success: true, data: undefined };
}

export async function deleteEmployee(
  slug: string,
  id: string,
): Promise<ActionResult> {
  const ctx = await requireCompanyContext({ slug, minRole: "admin" });

  const supabase = await createClient();
  const { error } = await supabase
    .from("employees")
    .update({ status: "terminated" })
    .eq("id", id)
    .eq("company_id", ctx.company.id);

  if (error) return { success: false, error: error.message };

  revalidatePath(`/${slug}/employees`);
  return { success: true, data: undefined };
}
