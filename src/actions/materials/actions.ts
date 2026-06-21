"use server";

import { revalidatePath } from "next/cache";
import { requireCompanyContext } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/actions/auth/actions";
import {
  createMaterialSchema,
  linkMaterialServiceSchema,
  recordConsumptionSchema,
  recordPurchaseSchema,
  recordUsageSchema,
  type CreateMaterialInput,
  type LinkMaterialServiceInput,
  type RecordConsumptionInput,
  type RecordPurchaseInput,
  type RecordUsageInput,
} from "@/lib/validations/materials";

function materialPaths(slug: string) {
  return [`/${slug}/operations`, `/${slug}/operations/materials`];
}

function revalidateMaterials(slug: string) {
  for (const path of materialPaths(slug)) {
    revalidatePath(path);
  }
  revalidatePath(`/${slug}/operations`, "layout");
}

async function adjustStock(
  companyId: string,
  materialId: string,
  delta: number,
): Promise<ActionResult<number>> {
  const supabase = await createClient();
  const { data: material, error: fetchError } = await supabase
    .from("materials")
    .select("quantity_on_hand")
    .eq("id", materialId)
    .eq("company_id", companyId)
    .single();

  if (fetchError || !material) {
    return { success: false, error: fetchError?.message ?? "Material not found" };
  }

  const current = Number(material.quantity_on_hand);
  const next = current + delta;
  if (next < 0) {
    return { success: false, error: "Insufficient stock" };
  }

  const { error } = await supabase
    .from("materials")
    .update({ quantity_on_hand: next })
    .eq("id", materialId)
    .eq("company_id", companyId);

  if (error) return { success: false, error: error.message };
  return { success: true, data: next };
}

export async function createMaterialAction(
  slug: string,
  input: CreateMaterialInput,
): Promise<ActionResult<{ id: string }>> {
  const ctx = await requireCompanyContext({ slug, minRole: "supervisor" });
  const parsed = createMaterialSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("materials")
    .insert({
      company_id: ctx.company.id,
      name: parsed.data.name,
      sku: parsed.data.sku || null,
      description: parsed.data.description || null,
      unit: parsed.data.unit,
      quantity_on_hand: parsed.data.quantityOnHand ?? 0,
      min_stock_level: parsed.data.minStockLevel ?? 0,
      unit_cost_cents: parsed.data.unitCostCents ?? null,
      service_id: parsed.data.serviceId ?? null,
    })
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };
  revalidateMaterials(slug);
  return { success: true, data: { id: data.id } };
}

export async function deleteMaterialAction(slug: string, materialId: string): Promise<ActionResult> {
  const ctx = await requireCompanyContext({ slug, minRole: "supervisor" });
  const supabase = await createClient();
  const { error } = await supabase
    .from("materials")
    .delete()
    .eq("id", materialId)
    .eq("company_id", ctx.company.id);
  if (error) return { success: false, error: error.message };
  revalidateMaterials(slug);
  return { success: true, data: undefined };
}

export async function linkMaterialServiceAction(
  slug: string,
  input: LinkMaterialServiceInput,
): Promise<ActionResult> {
  const ctx = await requireCompanyContext({ slug, minRole: "supervisor" });
  const parsed = linkMaterialServiceSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("material_service_links").upsert(
    {
      company_id: ctx.company.id,
      material_id: parsed.data.materialId,
      service_id: parsed.data.serviceId,
      quantity_per_service: parsed.data.quantityPerService,
      notes: parsed.data.notes || null,
    },
    { onConflict: "material_id,service_id" },
  );

  if (error) return { success: false, error: error.message };
  revalidateMaterials(slug);
  return { success: true, data: undefined };
}

export async function recordPurchaseAction(
  slug: string,
  input: RecordPurchaseInput,
): Promise<ActionResult> {
  const ctx = await requireCompanyContext({ slug, minRole: "supervisor" });
  const parsed = recordPurchaseSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  }

  const totalCost =
    parsed.data.unitCostCents != null
      ? Math.round(parsed.data.unitCostCents * parsed.data.quantity)
      : null;

  const supabase = await createClient();
  const { error } = await supabase.from("material_purchases").insert({
    company_id: ctx.company.id,
    material_id: parsed.data.materialId,
    quantity: parsed.data.quantity,
    unit_cost_cents: parsed.data.unitCostCents ?? null,
    total_cost_cents: totalCost,
    vendor: parsed.data.vendor || null,
    invoice_ref: parsed.data.invoiceRef || null,
    purchased_at: parsed.data.purchasedAt || new Date().toISOString().slice(0, 10),
    notes: parsed.data.notes || null,
    created_by: ctx.profile.id,
  });

  if (error) return { success: false, error: error.message };

  const stockResult = await adjustStock(ctx.company.id, parsed.data.materialId, parsed.data.quantity);
  if (!stockResult.success) return stockResult;

  if (parsed.data.unitCostCents != null) {
    await supabase
      .from("materials")
      .update({ unit_cost_cents: parsed.data.unitCostCents })
      .eq("id", parsed.data.materialId);
  }

  revalidateMaterials(slug);
  return { success: true, data: undefined };
}

export async function recordUsageAction(
  slug: string,
  input: RecordUsageInput,
): Promise<ActionResult> {
  const ctx = await requireCompanyContext({ slug, minRole: "supervisor" });
  const parsed = recordUsageSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  }

  const stockResult = await adjustStock(ctx.company.id, parsed.data.materialId, -parsed.data.quantity);
  if (!stockResult.success) return stockResult;

  const supabase = await createClient();
  const { error } = await supabase.from("material_usage").insert({
    company_id: ctx.company.id,
    material_id: parsed.data.materialId,
    quantity: parsed.data.quantity,
    employee_id: parsed.data.employeeId ?? null,
    task_id: parsed.data.taskId ?? null,
    service_id: parsed.data.serviceId ?? null,
    notes: parsed.data.notes || null,
    created_by: ctx.profile.id,
  });

  if (error) {
    await adjustStock(ctx.company.id, parsed.data.materialId, parsed.data.quantity);
    return { success: false, error: error.message };
  }

  revalidateMaterials(slug);
  return { success: true, data: undefined };
}

export async function recordConsumptionAction(
  slug: string,
  input: RecordConsumptionInput,
): Promise<ActionResult> {
  const ctx = await requireCompanyContext({ slug, minRole: "supervisor" });
  const parsed = recordConsumptionSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  }

  const stockResult = await adjustStock(ctx.company.id, parsed.data.materialId, -parsed.data.quantity);
  if (!stockResult.success) return stockResult;

  const supabase = await createClient();
  const { error } = await supabase.from("material_consumption").insert({
    company_id: ctx.company.id,
    material_id: parsed.data.materialId,
    service_id: parsed.data.serviceId,
    quantity: parsed.data.quantity,
    task_id: parsed.data.taskId ?? null,
    employee_id: parsed.data.employeeId ?? null,
    notes: parsed.data.notes || null,
    created_by: ctx.profile.id,
  });

  if (error) {
    await adjustStock(ctx.company.id, parsed.data.materialId, parsed.data.quantity);
    return { success: false, error: error.message };
  }

  revalidateMaterials(slug);
  return { success: true, data: undefined };
}
