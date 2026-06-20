"use server";

import { revalidatePath } from "next/cache";
import { requireCompanyContext } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/actions/auth/actions";

export async function addTaskComment(
  slug: string,
  taskId: string,
  text: string,
): Promise<ActionResult> {
  if (!text.trim()) return { success: false, error: "Kommentar darf nicht leer sein" };
  if (text.length > 1000)
    return { success: false, error: "Maximal 1000 Zeichen" };

  const ctx = await requireCompanyContext({ slug });
  const supabase = await createClient();

  // Store comment as activity_log entry with action='comment'
  const { error } = await supabase.from("activity_logs").insert({
    company_id: ctx.company.id,
    entity_type: "task",
    entity_id: taskId,
    action: "comment",
    performed_by: ctx.profile.id,
    metadata: { text: text.trim(), author: ctx.profile.full_name },
  });

  if (error) return { success: false, error: error.message };

  revalidatePath(`/${slug}/tasks/${taskId}`);
  return { success: true, data: undefined };
}

export async function deleteTaskComment(
  slug: string,
  commentId: string,
  taskId: string,
): Promise<ActionResult> {
  const ctx = await requireCompanyContext({ slug });
  const supabase = await createClient();

  const { error } = await supabase
    .from("activity_logs")
    .delete()
    .eq("id", commentId)
    .eq("company_id", ctx.company.id)
    .eq("action", "comment")
    .eq("performed_by", ctx.profile.id); // only own comments

  if (error) return { success: false, error: error.message };

  revalidatePath(`/${slug}/tasks/${taskId}`);
  return { success: true, data: undefined };
}
