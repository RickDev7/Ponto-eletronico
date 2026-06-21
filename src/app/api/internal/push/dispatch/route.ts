import { NextResponse } from "next/server";
import { dispatchEmployeePushNotification } from "@/lib/notifications/web-push";

interface WebhookBody {
  notificationId?: string;
  record?: { id?: string };
  type?: string;
}

function getSecret(request: Request): string | null {
  const auth = request.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  return request.headers.get("x-push-webhook-secret");
}

export async function POST(request: Request) {
  const expected = process.env.PUSH_WEBHOOK_SECRET;
  if (!expected) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }

  const secret = getSecret(request);
  if (secret !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: WebhookBody;
  try {
    body = (await request.json()) as WebhookBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const notificationId = body.notificationId ?? body.record?.id;
  if (!notificationId) {
    return NextResponse.json({ error: "Missing notificationId" }, { status: 400 });
  }

  const result = await dispatchEmployeePushNotification(notificationId);
  return NextResponse.json({ ok: true, ...result });
}
