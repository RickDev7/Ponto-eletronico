"use server";

import { revalidatePath } from "next/cache";
import { requireCompanyContext } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/actions/auth/actions";

export interface TaskTag {
  id: string;
  name: string;
  color: string;
}

// ── Company tag CRUD ──────────────────────────────────────────────────────────

export async function getCompanyTags(slug: string): Promise<TaskTag[]> {
  const ctx = await requireCompanyContext({ slug });
  const supabase = await createClient();
  const { data } = await supabase
    .from("task_tags")
    .select("id, name, color")
    .eq("company_id", ctx.company.id)
    .order("name");
  return (data ?? []) as TaskTag[];
}

export async function createTag(
  slug: string,
  name: string,
  color: string,
): Promise<ActionResult<TaskTag>> {
  const ctx = await requireCompanyContext({ slug, minRole: "supervisor" });
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("task_tags")
    .insert({ company_id: ctx.company.id, name: name.trim(), color, created_by: ctx.profile.id })
    .select("id, name, color")
    .single();
  if (error) return { success: false, error: error.message };
  revalidatePath(`/${slug}/tasks`);
  return { success: true, data: data as TaskTag };
}

export async function deleteTag(slug: string, tagId: string): Promise<ActionResult> {
  const ctx = await requireCompanyContext({ slug, minRole: "supervisor" });
  const supabase = await createClient();
  const { error } = await supabase
    .from("task_tags")
    .delete()
    .eq("id", tagId)
    .eq("company_id", ctx.company.id);
  if (error) return { success: false, error: error.message };
  revalidatePath(`/${slug}/tasks`);
  return { success: true, data: undefined };
}

// ── Task-tag assignments ──────────────────────────────────────────────────────

export async function assignTag(
  slug: string,
  taskId: string,
  tagId: string,
): Promise<ActionResult> {
  const ctx = await requireCompanyContext({ slug, minRole: "supervisor" });
  const supabase = await createClient();
  const { error } = await supabase
    .from("task_tag_assignments")
    .upsert({ task_id: taskId, tag_id: tagId, company_id: ctx.company.id });
  if (error) return { success: false, error: error.message };
  revalidatePath(`/${slug}/tasks`);
  return { success: true, data: undefined };
}

export async function removeTag(
  slug: string,
  taskId: string,
  tagId: string,
): Promise<ActionResult> {
  const ctx = await requireCompanyContext({ slug, minRole: "supervisor" });
  const supabase = await createClient();
  const { error } = await supabase
    .from("task_tag_assignments")
    .delete()
    .eq("task_id", taskId)
    .eq("tag_id", tagId)
    .eq("company_id", ctx.company.id);
  if (error) return { success: false, error: error.message };
  revalidatePath(`/${slug}/tasks`);
  return { success: true, data: undefined };
}

export async function getTaskTags(slug: string, taskId: string): Promise<TaskTag[]> {
  const ctx = await requireCompanyContext({ slug });
  const supabase = await createClient();
  const { data } = await supabase
    .from("task_tag_assignments")
    .select("tag:task_tags(id, name, color)")
    .eq("task_id", taskId)
    .eq("company_id", ctx.company.id);
  return (data ?? []).map((row) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tag = Array.isArray(row.tag) ? (row.tag as any[])[0] : row.tag;
    return tag;
  }).filter(Boolean) as TaskTag[];
}

// ── Address coordinates ───────────────────────────────────────────────────────

export async function updateAddressCoordinates(
  slug: string,
  addressId: string,
  latitude: number,
  longitude: number,
): Promise<ActionResult> {
  const ctx = await requireCompanyContext({ slug, minRole: "supervisor" });
  const supabase = await createClient();
  const { error } = await supabase
    .from("addresses")
    .update({ latitude, longitude })
    .eq("id", addressId)
    .eq("company_id", ctx.company.id);
  if (error) return { success: false, error: error.message };
  revalidatePath(`/${slug}/addresses/${addressId}`);
  return { success: true, data: undefined };
}
