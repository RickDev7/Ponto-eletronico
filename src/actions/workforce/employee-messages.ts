"use server";

import { revalidatePath } from "next/cache";
import { requireCompanyContext } from "@/lib/auth/guards";
import { can } from "@/config/permissions";
import { createClient } from "@/lib/supabase/server";
import { STORAGE_BUCKETS } from "@/config/constants";
import type { ActionResult } from "@/actions/auth/actions";

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

function revalidateAdminMessagePaths(slug: string) {
  revalidatePath(`/${slug}/workforce/messages`);
  revalidatePath(`/${slug}/mobile/messages`);
  revalidatePath(`/${slug}/mobile`);
}

async function uploadMessageAttachment(
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

async function insertManagerMessage(
  companyId: string,
  memberId: string,
  input: {
    threadId: string;
    recipientEmployeeId: string;
    subject?: string;
    body: string;
    attachmentPath?: string | null;
  },
): Promise<ActionResult<{ messageId: string }>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("employee_messages")
    .insert({
      company_id: companyId,
      thread_id: input.threadId,
      recipient_employee_id: input.recipientEmployeeId,
      sender_member_id: memberId,
      subject: input.subject?.trim() || null,
      body: input.body.trim(),
      attachment_path: input.attachmentPath ?? null,
    })
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, data: { messageId: data.id as string } };
}

export async function sendManagerMessageAction(
  slug: string,
  formData: FormData,
): Promise<ActionResult<{ threadIds: string[]; sent: number }>> {
  const ctx = await requireCompanyContext({ slug, minRole: "supervisor" });
  if (!can(ctx.membership.role, "employees:write")) {
    return { success: false, error: "Sem permissão" };
  }

  const body = (formData.get("body") as string | null)?.trim();
  if (!body) return { success: false, error: "Mensagem obrigatória" };

  const subject = (formData.get("subject") as string | null)?.trim() || undefined;
  const employeeId = formData.get("employeeId") as string | null;
  const teamId = formData.get("teamId") as string | null;
  const existingThreadId = formData.get("threadId") as string | null;
  const file = formData.get("attachment") as File | null;
  const hasFile = file && file.size > 0;

  const supabase = await createClient();
  let recipientIds: string[] = [];

  if (employeeId) {
    recipientIds = [employeeId];
  } else if (teamId) {
    const { data: members, error } = await supabase
      .from("team_members")
      .select("employee_id")
      .eq("company_id", ctx.company.id)
      .eq("team_id", teamId);

    if (error) return { success: false, error: error.message };
    recipientIds = (members ?? []).map((m) => m.employee_id as string);
    if (!recipientIds.length) {
      return { success: false, error: "Equipa sem colaboradores" };
    }
  } else if (existingThreadId) {
    const { data: threadRow } = await supabase
      .from("employee_messages")
      .select("recipient_employee_id")
      .eq("company_id", ctx.company.id)
      .eq("thread_id", existingThreadId)
      .limit(1)
      .maybeSingle();

    if (!threadRow?.recipient_employee_id) {
      return { success: false, error: "Conversa não encontrada" };
    }
    recipientIds = [threadRow.recipient_employee_id as string];
  } else {
    return { success: false, error: "Destinatário obrigatório" };
  }

  const threadIds: string[] = [];

  for (const recipientEmployeeId of recipientIds) {
    const threadId =
      existingThreadId && recipientIds.length === 1
        ? existingThreadId
        : crypto.randomUUID();

    let attachmentPath: string | null = null;
    if (hasFile && file) {
      const upload = await uploadMessageAttachment(ctx.company.id, threadId, file);
      if (!upload.success) return upload;
      attachmentPath = upload.data.path;
    }

    const result = await insertManagerMessage(ctx.company.id, ctx.membership.id, {
      threadId,
      recipientEmployeeId,
      subject,
      body,
      attachmentPath,
    });

    if (!result.success) return result;
    threadIds.push(threadId);
  }

  revalidateAdminMessagePaths(slug);
  return { success: true, data: { threadIds, sent: recipientIds.length } };
}

export async function markManagerThreadReadAction(
  slug: string,
  threadId: string,
): Promise<ActionResult> {
  const ctx = await requireCompanyContext({ slug, minRole: "supervisor" });
  if (!can(ctx.membership.role, "employees:read")) {
    return { success: false, error: "Sem permissão" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("employee_messages")
    .update({ read_at: new Date().toISOString() })
    .eq("company_id", ctx.company.id)
    .eq("thread_id", threadId)
    .not("sender_employee_id", "is", null)
    .is("read_at", null);

  if (error) return { success: false, error: error.message };
  revalidateAdminMessagePaths(slug);
  return { success: true, data: undefined };
}
