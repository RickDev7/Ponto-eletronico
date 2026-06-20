"use server";

import { revalidatePath } from "next/cache";
import { requireCompanyContext } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/actions/auth/actions";

export async function addChecklistItem(
  slug: string,
  taskId: string,
  text: string,
): Promise<ActionResult<{ id: string }>> {
  const ctx = await requireCompanyContext({ slug, minRole: "supervisor" });
  const trimmed = text.trim();
  if (!trimmed || trimmed.length > 500) {
    return { success: false, error: "Text muss 1–500 Zeichen haben" };
  }

  const supabase = await createClient();

  // Get current max sort_order
  const { data: existing } = await supabase
    .from("task_checklist_items")
    .select("sort_order")
    .eq("task_id", taskId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextOrder = (existing?.sort_order ?? -1) + 1;

  const { data, error } = await supabase
    .from("task_checklist_items")
    .insert({
      task_id: taskId,
      company_id: ctx.company.id,
      text: trimmed,
      sort_order: nextOrder,
      created_by: ctx.profile.id,
    })
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };
  revalidatePath(`/${slug}/tasks/${taskId}`);
  return { success: true, data: { id: data.id } };
}

export async function toggleChecklistItem(
  slug: string,
  itemId: string,
  taskId: string,
  checked: boolean,
): Promise<ActionResult> {
  const ctx = await requireCompanyContext({ slug });
  const supabase = await createClient();

  const { error } = await supabase
    .from("task_checklist_items")
    .update({
      is_checked: checked,
      checked_at: checked ? new Date().toISOString() : null,
      checked_by: checked ? ctx.profile.id : null,
    })
    .eq("id", itemId)
    .eq("company_id", ctx.company.id);

  if (error) return { success: false, error: error.message };
  revalidatePath(`/${slug}/tasks/${taskId}`);
  return { success: true, data: undefined };
}

export async function deleteChecklistItem(
  slug: string,
  itemId: string,
  taskId: string,
): Promise<ActionResult> {
  const ctx = await requireCompanyContext({ slug, minRole: "supervisor" });
  const supabase = await createClient();

  const { error } = await supabase
    .from("task_checklist_items")
    .delete()
    .eq("id", itemId)
    .eq("company_id", ctx.company.id);

  if (error) return { success: false, error: error.message };
  revalidatePath(`/${slug}/tasks/${taskId}`);
  return { success: true, data: undefined };
}

export async function updateChecklistItemText(
  slug: string,
  itemId: string,
  taskId: string,
  text: string,
): Promise<ActionResult> {
  const ctx = await requireCompanyContext({ slug, minRole: "supervisor" });
  const trimmed = text.trim();
  if (!trimmed || trimmed.length > 500) {
    return { success: false, error: "Text muss 1–500 Zeichen haben" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("task_checklist_items")
    .update({ text: trimmed })
    .eq("id", itemId)
    .eq("company_id", ctx.company.id);

  if (error) return { success: false, error: error.message };
  revalidatePath(`/${slug}/tasks/${taskId}`);
  return { success: true, data: undefined };
}
