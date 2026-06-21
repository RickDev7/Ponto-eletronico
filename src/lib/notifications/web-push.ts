import "server-only";

import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";

export interface WebPushPayload {
  title: string;
  body?: string;
  url?: string;
  tag?: string;
  data?: Record<string, string>;
}

function getVapidConfig() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? "mailto:support@feldops.app";

  if (!publicKey || !privateKey) {
    return null;
  }

  return { publicKey, privateKey, subject };
}

export function isWebPushConfigured(): boolean {
  return getVapidConfig() !== null;
}

export function getVapidPublicKey(): string | null {
  return getVapidConfig()?.publicKey ?? null;
}

function ensureWebPush() {
  const config = getVapidConfig();
  if (!config) {
    throw new Error("Web Push not configured (VAPID keys missing)");
  }

  webpush.setVapidDetails(config.subject, config.publicKey, config.privateKey);
  return webpush;
}

export interface PushSubscriptionRecord {
  id: string;
  endpoint: string;
  p256dh: string;
  auth_key: string;
}

export async function sendWebPush(
  subscription: PushSubscriptionRecord,
  payload: WebPushPayload,
): Promise<{ ok: true } | { ok: false; expired: boolean; error: string }> {
  const push = ensureWebPush();

  try {
    await push.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth_key,
        },
      },
      JSON.stringify(payload),
    );
    return { ok: true };
  } catch (error) {
    const statusCode =
      error && typeof error === "object" && "statusCode" in error
        ? Number((error as { statusCode: number }).statusCode)
        : 0;
    const message = error instanceof Error ? error.message : "Push failed";
    return { ok: false, expired: statusCode === 404 || statusCode === 410, error: message };
  }
}

export async function loadPushSubscriptionsForEmployee(
  companyId: string,
  employeeId: string,
): Promise<PushSubscriptionRecord[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("employee_push_subscriptions")
    .select("id, endpoint, p256dh, auth_key")
    .eq("company_id", companyId)
    .eq("employee_id", employeeId);

  return (data ?? []) as PushSubscriptionRecord[];
}

export async function dispatchEmployeePushNotification(
  notificationId: string,
): Promise<{ sent: number; failed: number; skipped: boolean }> {
  if (!isWebPushConfigured()) {
    return { sent: 0, failed: 0, skipped: true };
  }

  const supabase = createAdminClient();

  const { data: notification } = await supabase
    .from("employee_notifications")
    .select("id, company_id, employee_id, kind, title, body, payload, entity_type, entity_id, push_sent_at")
    .eq("id", notificationId)
    .maybeSingle();

  if (!notification || notification.push_sent_at) {
    return { sent: 0, failed: 0, skipped: true };
  }

  const payloadJson = (notification.payload ?? {}) as Record<string, string>;
  const slug = payloadJson.slug ?? "";
  const taskId = payloadJson.taskId ?? notification.entity_id ?? "";
  const url =
    notification.kind === "task_assigned" && slug && taskId
      ? `/${slug}/mobile/services/${taskId}`
      : slug
        ? `/${slug}/mobile/notifications`
        : "/";

  const pushPayload: WebPushPayload = {
    title: notification.title,
    body: notification.body ?? undefined,
    url,
    tag: notification.id,
    data: {
      notificationId: notification.id,
      kind: notification.kind,
      slug,
      ...(taskId ? { taskId } : {}),
    },
  };

  const subscriptions = await loadPushSubscriptionsForEmployee(
    notification.company_id,
    notification.employee_id,
  );

  if (!subscriptions.length) {
    await supabase
      .from("employee_notifications")
      .update({ push_sent_at: new Date().toISOString() })
      .eq("id", notificationId);
    return { sent: 0, failed: 0, skipped: false };
  }

  let sent = 0;
  let failed = 0;

  for (const sub of subscriptions) {
    const result = await sendWebPush(sub, pushPayload);
    if (result.ok) {
      sent += 1;
    } else {
      failed += 1;
      if (result.expired) {
        await supabase.from("employee_push_subscriptions").delete().eq("id", sub.id);
      }
    }
  }

  await supabase
    .from("employee_notifications")
    .update({ push_sent_at: new Date().toISOString() })
    .eq("id", notificationId);

  return { sent, failed, skipped: false };
}
