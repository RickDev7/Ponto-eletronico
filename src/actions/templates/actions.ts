"use server";

import { revalidatePath } from "next/cache";
import { requireCompanyContext } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/actions/auth/actions";

export interface TemplateChecklistItem {
  id: string;
  text: string;
}

export interface TaskTemplate {
  id: string;
  name: string;
  service_type: string;
  description: string | null;
  default_duration_minutes: number | null;
  checklist_items: TemplateChecklistItem[];
  is_active: boolean;
  created_at: string;
}

export async function getTemplates(slug: string): Promise<ActionResult<TaskTemplate[]>> {
  const ctx = await requireCompanyContext({ slug });
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("task_templates")
    .select("id, name, service_type, description, default_duration_minutes, checklist_items, is_active, created_at")
    .eq("company_id", ctx.company.id)
    .eq("is_active", true)
    .order("name");

  if (error) return { success: false, error: error.message };
  return { success: true, data: (data ?? []) as TaskTemplate[] };
}

export async function createTemplate(
  slug: string,
  values: {
    name: string;
    service_type: string;
    description?: string;
    default_duration_minutes?: number;
    checklist_items?: TemplateChecklistItem[];
  },
): Promise<ActionResult<{ id: string }>> {
  const ctx = await requireCompanyContext({ slug, minRole: "supervisor" });
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("task_templates")
    .insert({
      company_id: ctx.company.id,
      name: values.name.trim(),
      service_type: values.service_type,
      description: values.description?.trim() || null,
      default_duration_minutes: values.default_duration_minutes || null,
      checklist_items: values.checklist_items ?? [],
      created_by: ctx.profile.id,
    })
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };
  revalidatePath(`/${slug}/settings/templates`);
  return { success: true, data: { id: data.id } };
}

export async function updateTemplate(
  slug: string,
  templateId: string,
  values: {
    name?: string;
    description?: string;
    default_duration_minutes?: number | null;
    checklist_items?: TemplateChecklistItem[];
  },
): Promise<ActionResult> {
  const ctx = await requireCompanyContext({ slug, minRole: "supervisor" });
  const supabase = await createClient();

  const { error } = await supabase
    .from("task_templates")
    .update({
      ...(values.name !== undefined && { name: values.name.trim() }),
      ...(values.description !== undefined && { description: values.description?.trim() || null }),
      ...(values.default_duration_minutes !== undefined && {
        default_duration_minutes: values.default_duration_minutes,
      }),
      ...(values.checklist_items !== undefined && { checklist_items: values.checklist_items }),
    })
    .eq("id", templateId)
    .eq("company_id", ctx.company.id);

  if (error) return { success: false, error: error.message };
  revalidatePath(`/${slug}/settings/templates`);
  return { success: true, data: undefined };
}

export async function deleteTemplate(slug: string, templateId: string): Promise<ActionResult> {
  const ctx = await requireCompanyContext({ slug, minRole: "supervisor" });
  const supabase = await createClient();

  const { error } = await supabase
    .from("task_templates")
    .update({ is_active: false })
    .eq("id", templateId)
    .eq("company_id", ctx.company.id);

  if (error) return { success: false, error: error.message };
  revalidatePath(`/${slug}/settings/templates`);
  return { success: true, data: undefined };
}
