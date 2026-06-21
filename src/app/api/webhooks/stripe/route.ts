import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getStripe, isStripeConfigured } from "@/lib/billing/stripe";
import { createClient } from "@supabase/supabase-js";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key);
}

export async function POST(request: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  const body = await request.text();
  const signature = (await headers()).get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Missing webhook config" }, { status: 400 });
  }

  const stripe = getStripe();
  let event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const supabase = getAdminClient();

  const { error: idempotencyError } = await supabase.from("billing_events").insert({
    stripe_event_id: event.id,
    event_type: event.type,
    payload: event.data.object as unknown as Record<string, unknown>,
    company_id:
      (event.data.object as { metadata?: { company_id?: string } }).metadata
        ?.company_id ?? null,
  });

  if (idempotencyError?.code === "23505") {
    return NextResponse.json({ received: true, duplicate: true });
  }

  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const sub = event.data.object as {
        id: string;
        customer: string;
        status: string;
        metadata?: { company_id?: string; plan_key?: string };
        trial_end?: number | null;
        current_period_start: number;
        current_period_end: number;
        cancel_at_period_end: boolean;
      };

      const companyId = sub.metadata?.company_id;
      if (companyId) {
        await supabase.from("subscriptions").upsert({
          company_id: companyId,
          stripe_customer_id: sub.customer,
          stripe_subscription_id: sub.id,
          plan_key: sub.metadata?.plan_key ?? "professional",
          status: sub.status as never,
          trial_ends_at: sub.trial_end
            ? new Date(sub.trial_end * 1000).toISOString()
            : null,
          current_period_start: new Date(
            sub.current_period_start * 1000,
          ).toISOString(),
          current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
          cancel_at_period_end: sub.cancel_at_period_end,
        });
      }
      break;
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object as {
        metadata?: { company_id?: string };
      };
      if (sub.metadata?.company_id) {
        await supabase
          .from("subscriptions")
          .update({ status: "canceled" })
          .eq("company_id", sub.metadata.company_id);
      }
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ received: true });
}
