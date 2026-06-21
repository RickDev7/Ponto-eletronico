import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-push-webhook-secret",
};

interface DispatchBody {
  notificationId?: string;
  record?: { id?: string };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const secret = req.headers.get("x-push-webhook-secret");
  const expected = Deno.env.get("PUSH_WEBHOOK_SECRET");
  if (!expected || secret !== expected) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const body = (await req.json()) as DispatchBody;
  const notificationId = body.notificationId ?? body.record?.id;
  if (!notificationId) {
    return new Response(JSON.stringify({ error: "Missing notificationId" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const vapidPublic = Deno.env.get("VAPID_PUBLIC_KEY");
  const vapidPrivate = Deno.env.get("VAPID_PRIVATE_KEY");
  const vapidSubject = Deno.env.get("VAPID_SUBJECT") ?? "mailto:support@feldops.app";

  if (!vapidPublic || !vapidPrivate) {
    return new Response(JSON.stringify({ skipped: true, reason: "vapid_not_configured" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);

  const notifRes = await fetch(
    `${supabaseUrl}/rest/v1/employee_notifications?id=eq.${notificationId}&select=id,company_id,employee_id,kind,title,body,payload,entity_id,push_sent_at`,
    {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
    },
  );

  const notifications = await notifRes.json();
  const notification = notifications[0];
  if (!notification || notification.push_sent_at) {
    return new Response(JSON.stringify({ skipped: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const subsRes = await fetch(
    `${supabaseUrl}/rest/v1/employee_push_subscriptions?company_id=eq.${notification.company_id}&employee_id=eq.${notification.employee_id}&select=id,endpoint,p256dh,auth_key`,
    {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
    },
  );
  const subscriptions = await subsRes.json();

  const payloadJson = notification.payload ?? {};
  const slug = payloadJson.slug ?? "";
  const taskId = payloadJson.taskId ?? notification.entity_id ?? "";
  const url =
    notification.kind === "task_assigned" && slug && taskId
      ? `/${slug}/mobile/services/${taskId}`
      : slug
        ? `/${slug}/mobile/notifications`
        : "/";

  const pushPayload = JSON.stringify({
    title: notification.title,
    body: notification.body ?? "",
    url,
    tag: notification.id,
    data: { notificationId: notification.id, kind: notification.kind, slug },
  });

  let sent = 0;
  let failed = 0;

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth_key },
        },
        pushPayload,
      );
      sent += 1;
    } catch {
      failed += 1;
    }
  }

  await fetch(`${supabaseUrl}/rest/v1/employee_notifications?id=eq.${notificationId}`, {
    method: "PATCH",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify({ push_sent_at: new Date().toISOString() }),
  });

  return new Response(JSON.stringify({ ok: true, sent, failed }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
