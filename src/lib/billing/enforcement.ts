import "server-only";

import { getTranslations } from "next-intl/server";
import { PLANS, resolvePlanKey } from "@/lib/billing/plans";
import type {
  CompanyBillingState,
  PlanEnforcementResult,
  PlanLimitKind,
} from "@/lib/billing/utils";
import { isUnlimited } from "@/lib/billing/utils";
import type { SubscriptionStatus } from "@/lib/billing/types";
import { createAdminClient } from "@/lib/supabase/admin";

export type { CompanyBillingState, PlanEnforcementResult, PlanLimitKind };

const WRITABLE_STATUSES = new Set<SubscriptionStatus | "none">([
  "trialing",
  "active",
  "none",
]);

function monthBoundsUtc(): { start: string; end: string } {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { start: start.toISOString(), end: end.toISOString() };
}

export async function getCompanyBillingState(
  companyId: string,
): Promise<CompanyBillingState> {
  const admin = createAdminClient();
  const { start, end } = monthBoundsUtc();

  const [subscriptionResult, employeesResult, invitesResult, tasksResult, clientsResult] =
    await Promise.all([
      admin
        .from("subscriptions")
        .select("plan_key, status")
        .eq("company_id", companyId)
        .maybeSingle(),
      admin
        .from("employees")
        .select("*", { count: "exact", head: true })
        .eq("company_id", companyId)
        .eq("status", "active"),
      admin
        .from("company_invites")
        .select("*", { count: "exact", head: true })
        .eq("company_id", companyId)
        .is("accepted_at", null)
        .gt("expires_at", new Date().toISOString()),
      admin
        .from("tasks")
        .select("*", { count: "exact", head: true })
        .eq("company_id", companyId)
        .gte("created_at", start)
        .lt("created_at", end),
      admin
        .from("clients")
        .select("*", { count: "exact", head: true })
        .eq("company_id", companyId)
        .neq("status", "archived"),
    ]);

  const planKey = resolvePlanKey(subscriptionResult.data?.plan_key ?? "starter");
  const plan = PLANS[planKey];
  const status = (subscriptionResult.data?.status ?? "none") as
    | SubscriptionStatus
    | "none";

  const employees = employeesResult.count ?? 0;
  const pendingInvites = invitesResult.count ?? 0;

  return {
    planKey,
    planName: plan.name,
    status,
    canWrite: WRITABLE_STATUSES.has(status),
    usage: {
      employees,
      pendingInvites,
      billableSeats: employees + pendingInvites,
      tasksThisMonth: tasksResult.count ?? 0,
      clients: clientsResult.count ?? 0,
    },
    limits: plan.limits,
  };
}

export async function enforcePlanLimit(
  companyId: string,
  kind: PlanLimitKind,
  additional = 1,
): Promise<PlanEnforcementResult> {
  const state = await getCompanyBillingState(companyId);
  const t = await getTranslations("errors.actions");

  if (!state.canWrite) {
    return { allowed: false, error: t("subscriptionInactive") };
  }

  if (kind === "employees") {
    const limit = state.limits.employees;
    if (!isUnlimited(limit)) {
      const next = state.usage.billableSeats + additional;
      if (next > limit) {
        return {
          allowed: false,
          error: t("planLimitEmployees", { limit }),
        };
      }
    }
    return { allowed: true };
  }

  const limit = state.limits.tasksPerMonth;
  if (!isUnlimited(limit)) {
    const next = state.usage.tasksThisMonth + additional;
    if (next > limit) {
      return {
        allowed: false,
        error: t("planLimitTasks", { limit }),
      };
    }
  }

  return { allowed: true };
}

export async function seedCompanySubscription(companyId: string): Promise<void> {
  const admin = createAdminClient();
  const trialEnds = new Date();
  trialEnds.setDate(trialEnds.getDate() + PLANS.starter.trialDays);

  await admin.from("subscriptions").upsert(
    {
      company_id: companyId,
      plan_key: "starter",
      status: "trialing",
      trial_ends_at: trialEnds.toISOString(),
    },
    { onConflict: "company_id", ignoreDuplicates: true },
  );
}
