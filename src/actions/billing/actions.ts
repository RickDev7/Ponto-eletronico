"use server";

import { redirect } from "next/navigation";
import { ROUTES } from "@/config/constants";
import { getStripe, isStripeConfigured } from "@/lib/billing/stripe";
import { PLANS, resolvePlanKey, type PlanKey } from "@/lib/billing/plans";
import { requireAuth } from "@/lib/auth/guards";
import { getUserCompanies } from "@/lib/auth/session";
import { resolveMembershipCompany } from "@/lib/auth/resolve-company";
import { createClient } from "@/lib/supabase/server";

export type BillingActionResult =
  | { success: true; url: string }
  | { success: false; error: string };

export async function createCheckoutSession(
  planKey: string,
): Promise<BillingActionResult> {
  const user = await requireAuth();
  const plan = PLANS[resolvePlanKey(planKey)];

  if (plan.key === "enterprise") {
    return { success: false, error: "Contact sales for Enterprise" };
  }

  const companies = await getUserCompanies(user.id);
  const membership = companies[0];
  const company = membership
    ? resolveMembershipCompany(membership.company)
    : null;

  if (!company) {
    redirect(ROUTES.onboarding);
  }

  if (!isStripeConfigured() || !plan.stripePriceId) {
    redirect(`${ROUTES.checkoutSuccess}?plan=${plan.key}&demo=1`);
  }

  const supabase = await createClient();
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("company_id", company.id)
    .maybeSingle();

  const stripe = getStripe();
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  let customerId = subscription?.stripe_customer_id ?? undefined;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { company_id: company.id, user_id: user.id },
    });
    customerId = customer.id;
    await supabase.from("subscriptions").upsert({
      company_id: company.id,
      stripe_customer_id: customerId,
      plan_key: plan.key,
      status: "trialing",
      trial_ends_at: new Date(
        Date.now() + plan.trialDays * 24 * 60 * 60 * 1000,
      ).toISOString(),
    });
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: plan.stripePriceId, quantity: 1 }],
    subscription_data: {
      trial_period_days: plan.trialDays,
      metadata: { company_id: company.id, plan_key: plan.key },
    },
    success_url: `${siteUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl}/checkout?plan=${plan.key}`,
    metadata: { company_id: company.id, plan_key: plan.key },
  });

  if (!session.url) {
    return { success: false, error: "Could not create checkout session" };
  }

  return { success: true, url: session.url };
}

export async function createBillingPortalSession(
  companyId: string,
): Promise<BillingActionResult> {
  await requireAuth();

  if (!isStripeConfigured()) {
    return { success: false, error: "Billing is not configured" };
  }

  const supabase = await createClient();
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("company_id", companyId)
    .maybeSingle();

  if (!subscription?.stripe_customer_id) {
    return { success: false, error: "No billing account found" };
  }

  const stripe = getStripe();
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const portal = await stripe.billingPortal.sessions.create({
    customer: subscription.stripe_customer_id,
    return_url: `${siteUrl}/settings`,
  });

  return { success: true, url: portal.url };
}

export async function getCompanyPlan(companyId: string): Promise<PlanKey> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("subscriptions")
    .select("plan_key, status")
    .eq("company_id", companyId)
    .maybeSingle();

  if (!data?.plan_key) return "starter";
  return resolvePlanKey(data.plan_key);
}
