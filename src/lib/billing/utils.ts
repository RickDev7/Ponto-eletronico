import type { PlanKey } from "@/lib/billing/plans";
import type { SubscriptionStatus } from "@/lib/billing/types";

export type PlanLimitKind = "employees" | "tasksPerMonth";

export interface CompanyBillingState {
  planKey: PlanKey;
  planName: string;
  status: SubscriptionStatus | "none";
  canWrite: boolean;
  usage: {
    employees: number;
    pendingInvites: number;
    billableSeats: number;
    tasksThisMonth: number;
    clients: number;
  };
  limits: {
    employees: number;
    tasksPerMonth: number;
    storageGb: number;
  };
}

export type PlanEnforcementResult =
  | { allowed: true }
  | { allowed: false; error: string };

export function isUnlimited(limit: number): boolean {
  return limit < 0;
}

export function usagePercent(used: number, limit: number): number {
  if (isUnlimited(limit) || limit === 0) return 0;
  return Math.min(100, Math.round((used / limit) * 100));
}

export function formatPlanLimit(limit: number): string {
  return isUnlimited(limit) ? "∞" : String(limit);
}
