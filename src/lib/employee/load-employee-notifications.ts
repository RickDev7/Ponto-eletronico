import "server-only";

import { createClient } from "@/lib/supabase/server";

export interface EmployeeNotificationRow {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  payload: Record<string, unknown>;
  entity_type: string | null;
  entity_id: string | null;
  read_at: string | null;
  created_at: string;
}

export async function loadEmployeeNotifications(
  companyId: string,
  employeeId: string,
  limit = 50,
) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("employee_notifications")
    .select("id, kind, title, body, payload, entity_type, entity_id, read_at, created_at")
    .eq("company_id", companyId)
    .eq("employee_id", employeeId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return { notifications: [], unreadCount: 0 };
  }

  const notifications = (data ?? []) as EmployeeNotificationRow[];
  const unreadCount = notifications.filter((n) => !n.read_at).length;

  return { notifications, unreadCount };
}

export async function loadEmployeeInboxUnreadCount(companyId: string, employeeId: string) {
  const supabase = await createClient();

  const [notifRes, msgRes] = await Promise.all([
    supabase
      .from("employee_notifications")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .eq("employee_id", employeeId)
      .is("read_at", null),
    supabase
      .from("employee_messages")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .eq("recipient_employee_id", employeeId)
      .is("read_at", null)
      .is("sender_employee_id", null),
  ]);

  return (notifRes.count ?? 0) + (msgRes.count ?? 0);
}
