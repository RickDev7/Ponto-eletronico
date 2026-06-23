import "server-only";

import { createClient } from "@/lib/supabase/server";
import { STORAGE_BUCKETS } from "@/config/constants";

export interface EmployeeMessageRow {
  id: string;
  thread_id: string;
  subject: string | null;
  body: string;
  attachment_path: string | null;
  attachment_url?: string | null;
  read_at: string | null;
  created_at: string;
  sender_employee_id: string | null;
  sender_member_id: string | null;
}

export async function loadEmployeeMessages(
  companyId: string,
  employeeId: string,
  limit = 50,
) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("employee_messages")
    .select(
      "id, thread_id, subject, body, attachment_path, read_at, created_at, sender_employee_id, sender_member_id",
    )
    .eq("company_id", companyId)
    .eq("recipient_employee_id", employeeId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return { messages: [] as EmployeeMessageRow[], unreadCount: 0 };
  }

  const rows = (data ?? []) as EmployeeMessageRow[];
  const paths = rows.map((m) => m.attachment_path).filter(Boolean) as string[];
  const urlMap: Record<string, string> = {};

  await Promise.all(
    paths.map(async (path) => {
      const { data: signed } = await supabase.storage
        .from(STORAGE_BUCKETS.employeeMessageAttachments)
        .createSignedUrl(path, 60 * 60);
      urlMap[path] = signed?.signedUrl ?? "";
    }),
  );

  const messages = rows.map((m) => ({
    ...m,
    attachment_url: m.attachment_path ? urlMap[m.attachment_path] ?? null : null,
  }));

  const unreadCount = messages.filter((m) => !m.read_at && !m.sender_employee_id).length;

  return { messages, unreadCount };
}

export async function loadEmployeeMessagesUnreadCount(
  companyId: string,
  employeeId: string,
) {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("employee_messages")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .eq("recipient_employee_id", employeeId)
    .is("read_at", null)
    .is("sender_employee_id", null);

  if (error) return 0;
  return count ?? 0;
}
