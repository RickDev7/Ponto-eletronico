"use server";

import { revalidatePath } from "next/cache";
import { requireEmployeeContext } from "@/lib/auth/guards";
import { dispatchEmployeePushNotification } from "@/lib/notifications/web-push";
import { createClient } from "@/lib/supabase/server";
import {
  pushSubscriptionSchema,
  type PushSubscriptionInput,
} from "@/lib/validations/employee-notifications";
import type { ActionResult } from "@/actions/auth/actions";

function revalidateNotificationPaths(slug: string) {
  revalidatePath(`/${slug}/mobile/notifications`);
  revalidatePath(`/${slug}/mobile`);
}

export async function registerPushSubscriptionAction(
  slug: string,
  input: PushSubscriptionInput,
  userAgent?: string | null,
): Promise<ActionResult> {
  const ctx = await requireEmployeeContext(slug);
  const parsed = pushSubscriptionSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid subscription" };
  }

  const supabase = await createClient();

  const { error } = await supabase.from("employee_push_subscriptions").upsert(
    {
      company_id: ctx.company.id,
      employee_id: ctx.employee.id,
      user_id: ctx.profile.id,
      endpoint: parsed.data.endpoint,
      p256dh: parsed.data.keys.p256dh,
      auth_key: parsed.data.keys.auth,
      user_agent: userAgent ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "endpoint" },
  );

  if (error) return { success: false, error: error.message };
  return { success: true, data: undefined };
}

export async function unregisterPushSubscriptionAction(
  slug: string,
  endpoint: string,
): Promise<ActionResult> {
  const ctx = await requireEmployeeContext(slug);
  const supabase = await createClient();

  const { error } = await supabase
    .from("employee_push_subscriptions")
    .delete()
    .eq("company_id", ctx.company.id)
    .eq("employee_id", ctx.employee.id)
    .eq("endpoint", endpoint);

  if (error) return { success: false, error: error.message };
  return { success: true, data: undefined };
}

export async function markEmployeeNotificationReadAction(
  slug: string,
  notificationId: string,
): Promise<ActionResult> {
  const ctx = await requireEmployeeContext(slug);
  const supabase = await createClient();

  const { error } = await supabase
    .from("employee_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("company_id", ctx.company.id)
    .eq("employee_id", ctx.employee.id)
    .is("read_at", null);

  if (error) return { success: false, error: error.message };

  revalidateNotificationPaths(slug);
  return { success: true, data: undefined };
}

export async function markAllEmployeeNotificationsReadAction(
  slug: string,
): Promise<ActionResult> {
  const ctx = await requireEmployeeContext(slug);
  const supabase = await createClient();

  const { error } = await supabase
    .from("employee_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("company_id", ctx.company.id)
    .eq("employee_id", ctx.employee.id)
    .is("read_at", null);

  if (error) return { success: false, error: error.message };

  revalidateNotificationPaths(slug);
  return { success: true, data: undefined };
}

export async function dispatchEmployeePushAction(
  notificationId: string,
): Promise<ActionResult<{ sent: number; failed: number }>> {
  try {
    const result = await dispatchEmployeePushNotification(notificationId);
    return {
      success: true,
      data: { sent: result.sent, failed: result.failed },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Push dispatch failed";
    return { success: false, error: message };
  }
}
