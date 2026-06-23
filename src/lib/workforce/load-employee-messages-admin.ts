import "server-only";

import { createClient } from "@/lib/supabase/server";
import { STORAGE_BUCKETS } from "@/config/constants";

export interface AdminMessageRow {
  id: string;
  thread_id: string;
  subject: string | null;
  body: string;
  attachment_path: string | null;
  attachment_url?: string | null;
  read_at: string | null;
  created_at: string;
  recipient_employee_id: string;
  sender_employee_id: string | null;
  sender_member_id: string | null;
  sender_name: string;
  is_from_employee: boolean;
}

export interface AdminMessageThreadSummary {
  thread_id: string;
  employee_id: string;
  employee_name: string;
  subject: string | null;
  last_body: string;
  last_at: string;
  message_count: number;
  needs_reply: boolean;
  has_unread_employee: boolean;
}

type RawMessage = {
  id: string;
  thread_id: string;
  subject: string | null;
  body: string;
  attachment_path: string | null;
  read_at: string | null;
  created_at: string;
  recipient_employee_id: string;
  sender_employee_id: string | null;
  sender_member_id: string | null;
  recipient: { full_name: string } | Array<{ full_name: string }> | null;
  sender_employee:
    | { full_name: string }
    | Array<{ full_name: string }>
    | null;
};

function pickName<T extends { full_name: string | null }>(
  row: T | T[] | null | undefined,
): string {
  if (!row) return "—";
  const item = Array.isArray(row) ? row[0] : row;
  return item?.full_name ?? "—";
}

async function signAttachmentPaths(paths: string[]): Promise<Record<string, string>> {
  if (!paths.length) return {};
  const supabase = await createClient();
  const entries = await Promise.all(
    paths.map(async (path) => {
      const { data } = await supabase.storage
        .from(STORAGE_BUCKETS.employeeMessageAttachments)
        .createSignedUrl(path, 60 * 60);
      return [path, data?.signedUrl ?? ""] as const;
    }),
  );
  return Object.fromEntries(entries);
}

async function loadMemberDisplayNames(
  memberIds: string[],
): Promise<Record<string, string>> {
  if (!memberIds.length) return {};
  const supabase = await createClient();
  const { data: members } = await supabase
    .from("company_members")
    .select("id, user_id")
    .in("id", memberIds);

  if (!members?.length) return {};

  const userIds = members.map((m) => m.user_id as string);
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", userIds);

  const profileMap = new Map(
    (profiles ?? []).map((p) => [p.id as string, (p.full_name as string) ?? "Operações"]),
  );

  return Object.fromEntries(
    members.map((m) => [
      m.id as string,
      profileMap.get(m.user_id as string) ?? "Operações",
    ]),
  );
}

export async function loadAdminMessageThreads(
  companyId: string,
): Promise<AdminMessageThreadSummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("employee_messages")
    .select(`
      id, thread_id, subject, body, read_at, created_at,
      recipient_employee_id, sender_employee_id, sender_member_id,
      recipient:employees!recipient_employee_id(full_name)
    `)
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(500);

  if (error || !data?.length) return [];

  const byThread = new Map<string, RawMessage[]>();
  for (const row of data as RawMessage[]) {
    const list = byThread.get(row.thread_id) ?? [];
    list.push(row);
    byThread.set(row.thread_id, list);
  }

  const summaries: AdminMessageThreadSummary[] = [];

  for (const [threadId, rows] of byThread) {
    const sorted = [...rows].sort((a, b) => b.created_at.localeCompare(a.created_at));
    const latest = sorted[0]!;
    const oldest = sorted[sorted.length - 1]!;
    const employeeName = pickName(latest.recipient);
    const subject =
      sorted.find((r) => r.subject)?.subject ??
      oldest.subject ??
      null;
    const needsReply = Boolean(latest.sender_employee_id);
    const hasUnreadEmployee = sorted.some(
      (r) => r.sender_employee_id && !r.read_at,
    );

    summaries.push({
      thread_id: threadId,
      employee_id: latest.recipient_employee_id,
      employee_name: employeeName,
      subject,
      last_body: latest.body,
      last_at: latest.created_at,
      message_count: rows.length,
      needs_reply: needsReply,
      has_unread_employee: hasUnreadEmployee,
    });
  }

  return summaries.sort((a, b) => b.last_at.localeCompare(a.last_at));
}

export async function loadAdminMessageThread(
  companyId: string,
  threadId: string,
): Promise<AdminMessageRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("employee_messages")
    .select(`
      id, thread_id, subject, body, attachment_path, read_at, created_at,
      recipient_employee_id, sender_employee_id, sender_member_id,
      sender_employee:employees!sender_employee_id(full_name)
    `)
    .eq("company_id", companyId)
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });

  if (error || !data) return [];

  const rows = data as RawMessage[];
  const memberIds = [
    ...new Set(rows.map((r) => r.sender_member_id).filter(Boolean)),
  ] as string[];
  const memberNames = await loadMemberDisplayNames(memberIds);

  const paths = rows.map((r) => r.attachment_path).filter(Boolean) as string[];
  const urlMap = await signAttachmentPaths(paths);

  return rows.map((row) => {
    const isFromEmployee = Boolean(row.sender_employee_id);
    const senderName = isFromEmployee
      ? pickName(row.sender_employee)
      : row.sender_member_id
        ? memberNames[row.sender_member_id] ?? "Operações"
        : "Operações";

    return {
      id: row.id,
      thread_id: row.thread_id,
      subject: row.subject,
      body: row.body,
      attachment_path: row.attachment_path,
      attachment_url: row.attachment_path ? urlMap[row.attachment_path] ?? null : null,
      read_at: row.read_at,
      created_at: row.created_at,
      recipient_employee_id: row.recipient_employee_id,
      sender_employee_id: row.sender_employee_id,
      sender_member_id: row.sender_member_id,
      sender_name: senderName,
      is_from_employee: isFromEmployee,
    };
  });
}
