"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  dispatchEmployeePushAction,
  markAllEmployeeNotificationsReadAction,
  markEmployeeNotificationReadAction,
} from "@/actions/employee/notifications";
import type { EmployeeNotificationRow } from "@/lib/employee/load-employee-notifications";

interface UseEmployeeNotificationsOptions {
  slug: string;
  companyId: string;
  employeeId: string;
  initialNotifications: EmployeeNotificationRow[];
  initialUnreadCount: number;
}

function isNotificationsTableMissing(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  return (
    error.code === "PGRST205" ||
    error.code === "42P01" ||
    error.message?.includes("employee_notifications") === true
  );
}

async function fetchUnreadCount(
  companyId: string,
  employeeId: string,
): Promise<{ count: number; tableMissing: boolean }> {
  const supabase = createClient();
  const { count, error } = await supabase
    .from("employee_notifications")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .eq("employee_id", employeeId)
    .is("read_at", null);

  if (isNotificationsTableMissing(error)) {
    return { count: 0, tableMissing: true };
  }

  return { count: count ?? 0, tableMissing: false };
}

export function useEmployeeNotifications({
  slug,
  companyId,
  employeeId,
  initialNotifications,
  initialUnreadCount,
}: UseEmployeeNotificationsOptions) {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);

  const reload = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("employee_notifications")
      .select("id, kind, title, body, payload, entity_type, entity_id, read_at, created_at")
      .eq("company_id", companyId)
      .eq("employee_id", employeeId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (isNotificationsTableMissing(error)) return;

    const rows = (data ?? []) as EmployeeNotificationRow[];
    setNotifications(rows);
    setUnreadCount(rows.filter((n) => !n.read_at).length);
  }, [companyId, employeeId]);

  useEffect(() => {
    let cancelled = false;
    let channel: ReturnType<ReturnType<typeof createClient>["channel"]> | null = null;
    const supabase = createClient();

    void (async () => {
      const { tableMissing } = await fetchUnreadCount(companyId, employeeId);
      if (cancelled || tableMissing) return;

      channel = supabase
        .channel(`employee-notifications:${employeeId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "employee_notifications",
            filter: `employee_id=eq.${employeeId}`,
          },
          (payload) => {
            const row = payload.new as EmployeeNotificationRow;
            setNotifications((prev) => [row, ...prev].slice(0, 50));
            setUnreadCount((c) => c + 1);
            void dispatchEmployeePushAction(row.id);
          },
        )
        .subscribe();
    })();

    return () => {
      cancelled = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [companyId, employeeId]);

  async function markRead(id: string) {
    const result = await markEmployeeNotificationReadAction(slug, id);
    if (result.success) {
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === id ? { ...n, read_at: new Date().toISOString() } : n,
        ),
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    }
  }

  async function markAllRead() {
    const result = await markAllEmployeeNotificationsReadAction(slug);
    if (result.success) {
      const now = new Date().toISOString();
      setNotifications((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? now })));
      setUnreadCount(0);
    }
  }

  return { notifications, unreadCount, markRead, markAllRead, reload };
}

/** Single shared subscription — mount once via EmployeeUnreadCountProvider. */
export function useEmployeeUnreadCountSubscription(
  companyId: string,
  employeeId: string,
  initial = 0,
) {
  const [unreadCount, setUnreadCount] = useState(initial);

  useEffect(() => {
    setUnreadCount(initial);
  }, [initial]);

  useEffect(() => {
    let cancelled = false;
    let channel: ReturnType<ReturnType<typeof createClient>["channel"]> | null = null;
    const supabase = createClient();

    async function refresh() {
      const { count } = await fetchUnreadCount(companyId, employeeId);
      if (!cancelled) setUnreadCount(count);
    }

    void (async () => {
      const { tableMissing } = await fetchUnreadCount(companyId, employeeId);
      if (cancelled) return;

      if (!tableMissing) {
        channel = supabase
          .channel(`employee-unread:${employeeId}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "employee_notifications",
              filter: `employee_id=eq.${employeeId}`,
            },
            () => void refresh(),
          )
          .subscribe();
      }

      await refresh();
    })();

    return () => {
      cancelled = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [companyId, employeeId]);

  return unreadCount;
}
