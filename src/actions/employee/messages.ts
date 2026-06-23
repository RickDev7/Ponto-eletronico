"use server";

import { revalidatePath } from "next/cache";
import { requireEmployeeContext } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { STORAGE_BUCKETS } from "@/config/constants";
import type { ActionResult } from "@/actions/auth/actions";

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

function revalidateMessagePaths(slug: string) {
  revalidatePath(`/${slug}/mobile/messages`);
  revalidatePath(`/${slug}/mobile`);
  revalidatePath(`/${slug}/workforce/messages`);
}

async function uploadEmployeeAttachment(
  companyId: string,
  threadId: string,
  file: File,
): Promise<ActionResult<{ path: string }>> {
  if (file.size > MAX_ATTACHMENT_BYTES) {
    return { success: false, error: "Ficheiro demasiado grande (máx. 10 MB)" };
  }
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
  const storagePath = `${companyId}/${threadId}/${crypto.randomUUID()}.${ext}`;
  const supabase = await createClient();
  const { error } = await supabase.storage
    .from(STORAGE_BUCKETS.employeeMessageAttachments)
    .upload(storagePath, file, { contentType: file.type, upsert: false });
  if (error) return { success: false, error: error.message };
  return { success: true, data: { path: storagePath } };
}

export async function markEmployeeMessageReadAction(
  slug: string,
  messageId: string,
): Promise<ActionResult> {
  const ctx = await requireEmployeeContext(slug);
  const supabase = await createClient();

  const { error } = await supabase
    .from("employee_messages")
    .update({ read_at: new Date().toISOString() })
    .eq("id", messageId)
    .eq("company_id", ctx.company.id)
    .eq("recipient_employee_id", ctx.employee.id)
    .is("read_at", null);

  if (error) return { success: false, error: error.message };
  revalidateMessagePaths(slug);
  return { success: true, data: undefined };
}

export async function markAllEmployeeMessagesReadAction(
  slug: string,
): Promise<ActionResult> {
  const ctx = await requireEmployeeContext(slug);
  const supabase = await createClient();

  const { error } = await supabase
    .from("employee_messages")
    .update({ read_at: new Date().toISOString() })
    .eq("company_id", ctx.company.id)
    .eq("recipient_employee_id", ctx.employee.id)
    .is("read_at", null);

  if (error) return { success: false, error: error.message };
  revalidateMessagePaths(slug);
  return { success: true, data: undefined };
}

export async function replyEmployeeMessageAction(
  slug: string,
  input: { threadId: string; body: string },
): Promise<ActionResult> {
  const ctx = await requireEmployeeContext(slug);
  const body = input.body.trim();
  if (!body) return { success: false, error: "Message required" };

  const supabase = await createClient();
  const { error } = await supabase.from("employee_messages").insert({
    company_id: ctx.company.id,
    thread_id: input.threadId,
    recipient_employee_id: ctx.employee.id,
    sender_employee_id: ctx.employee.id,
    body,
  });

  if (error) return { success: false, error: error.message };
  revalidateMessagePaths(slug);
  return { success: true, data: undefined };
}

export async function replyEmployeeMessageWithAttachmentAction(
  slug: string,
  formData: FormData,
): Promise<ActionResult> {
  const ctx = await requireEmployeeContext(slug);
  const threadId = formData.get("threadId") as string | null;
  const body = (formData.get("body") as string | null)?.trim();
  const file = formData.get("attachment") as File | null;

  if (!threadId || !body) return { success: false, error: "Message required" };

  let attachmentPath: string | null = null;
  if (file && file.size > 0) {
    const upload = await uploadEmployeeAttachment(ctx.company.id, threadId, file);
    if (!upload.success) return upload;
    attachmentPath = upload.data.path;
  }

  const supabase = await createClient();
  const { error } = await supabase.from("employee_messages").insert({
    company_id: ctx.company.id,
    thread_id: threadId,
    recipient_employee_id: ctx.employee.id,
    sender_employee_id: ctx.employee.id,
    body,
    attachment_path: attachmentPath,
  });

  if (error) return { success: false, error: error.message };
  revalidateMessagePaths(slug);
  return { success: true, data: undefined };
}

export async function composeEmployeeMessageAction(
  slug: string,
  input: { body: string; subject?: string; threadId?: string },
): Promise<ActionResult<{ threadId: string }>> {
  const ctx = await requireEmployeeContext(slug);
  const body = input.body.trim();
  if (!body) return { success: false, error: "Message required" };

  const threadId = input.threadId ?? crypto.randomUUID();
  const supabase = await createClient();
  const { error } = await supabase.from("employee_messages").insert({
    company_id: ctx.company.id,
    thread_id: threadId,
    recipient_employee_id: ctx.employee.id,
    sender_employee_id: ctx.employee.id,
    subject: input.subject?.trim() || null,
    body,
  });

  if (error) return { success: false, error: error.message };
  revalidateMessagePaths(slug);
  return { success: true, data: { threadId } };
}
