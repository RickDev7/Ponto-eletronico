"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { guardPlatformAdminAction } from "@/lib/auth/platform-guards";
import { writePlatformAudit, writePlatformLog } from "@/lib/platform/audit";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/actions/auth/actions";

const tenantStatusSchema = z.object({
  companyId: z.string().uuid(),
  status: z.enum(["active", "trial", "suspended"]),
  reason: z.string().max(500).optional(),
});

const subscriptionSchema = z.object({
  subscriptionId: z.string().uuid(),
  planKey: z.enum(["starter", "professional", "enterprise"]).optional(),
  status: z
    .enum([
      "trialing",
      "active",
      "past_due",
      "canceled",
      "incomplete",
      "incomplete_expired",
      "unpaid",
      "paused",
    ])
    .optional(),
});

const flagSchema = z.object({
  flagId: z.string().uuid(),
  enabled: z.boolean(),
});

const ticketStatusSchema = z.object({
  ticketId: z.string().uuid(),
  status: z.enum(["open", "in_progress", "waiting", "resolved", "closed"]),
  priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
});

export async function updateTenantStatusAction(
  raw: unknown,
): Promise<ActionResult<void>> {
  const guard = await guardPlatformAdminAction();
  if (!guard.ok) return { success: false, error: guard.error };
  const ctx = guard.ctx;
  const parsed = tenantStatusSchema.safeParse(raw);
  if (!parsed.success) return { success: false, error: "Invalid request" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("companies")
    .update({
      status: parsed.data.status,
      suspended_at: parsed.data.status === "suspended" ? new Date().toISOString() : null,
      suspended_reason:
        parsed.data.status === "suspended" ? (parsed.data.reason ?? null) : null,
    })
    .eq("id", parsed.data.companyId);

  if (error) return { success: false, error: error.message };

  await writePlatformAudit({
    actorId: ctx.userId,
    action: "tenant.status_updated",
    targetType: "company",
    targetId: parsed.data.companyId,
    companyId: parsed.data.companyId,
    metadata: { status: parsed.data.status, reason: parsed.data.reason },
  });

  revalidatePath("/super-admin");
  revalidatePath("/super-admin/tenants");
  return { success: true, data: undefined };
}

export async function updatePlatformSubscriptionAction(
  raw: unknown,
): Promise<ActionResult<void>> {
  const guard = await guardPlatformAdminAction();
  if (!guard.ok) return { success: false, error: guard.error };
  const ctx = guard.ctx;
  const parsed = subscriptionSchema.safeParse(raw);
  if (!parsed.success) return { success: false, error: "Invalid request" };

  const patch: Record<string, unknown> = {};
  if (parsed.data.planKey) patch.plan_key = parsed.data.planKey;
  if (parsed.data.status) patch.status = parsed.data.status;

  const supabase = await createClient();
  const { data: sub, error } = await supabase
    .from("subscriptions")
    .update(patch)
    .eq("id", parsed.data.subscriptionId)
    .select("company_id")
    .single();

  if (error) return { success: false, error: error.message };

  await writePlatformAudit({
    actorId: ctx.userId,
    action: "subscription.updated",
    targetType: "subscription",
    targetId: parsed.data.subscriptionId,
    companyId: sub.company_id,
    metadata: patch,
  });

  revalidatePath("/super-admin/subscriptions");
  return { success: true, data: undefined };
}

export async function toggleFeatureFlagAction(
  raw: unknown,
): Promise<ActionResult<void>> {
  const guard = await guardPlatformAdminAction();
  if (!guard.ok) return { success: false, error: guard.error };
  const ctx = guard.ctx;
  const parsed = flagSchema.safeParse(raw);
  if (!parsed.success) return { success: false, error: "Invalid request" };

  const supabase = await createClient();
  const { data: flag, error } = await supabase
    .from("feature_flags")
    .update({ enabled: parsed.data.enabled })
    .eq("id", parsed.data.flagId)
    .select("key, company_id")
    .single();

  if (error) return { success: false, error: error.message };

  await writePlatformAudit({
    actorId: ctx.userId,
    action: "feature_flag.toggled",
    targetType: "feature_flag",
    targetId: parsed.data.flagId,
    companyId: flag.company_id ?? undefined,
    metadata: { key: flag.key, enabled: parsed.data.enabled },
  });

  revalidatePath("/super-admin/feature-flags");
  return { success: true, data: undefined };
}

export async function updateSupportTicketAction(
  raw: unknown,
): Promise<ActionResult<void>> {
  const guard = await guardPlatformAdminAction();
  if (!guard.ok) return { success: false, error: guard.error };
  const ctx = guard.ctx;
  const parsed = ticketStatusSchema.safeParse(raw);
  if (!parsed.success) return { success: false, error: "Invalid request" };

  const patch: Record<string, unknown> = { status: parsed.data.status };
  if (parsed.data.priority) patch.priority = parsed.data.priority;
  if (parsed.data.status === "resolved" || parsed.data.status === "closed") {
    patch.resolved_at = new Date().toISOString();
  }

  const supabase = await createClient();
  const { data: ticket, error } = await supabase
    .from("support_tickets")
    .update(patch)
    .eq("id", parsed.data.ticketId)
    .select("company_id, subject")
    .single();

  if (error) return { success: false, error: error.message };

  await writePlatformAudit({
    actorId: ctx.userId,
    action: "support_ticket.updated",
    targetType: "support_ticket",
    targetId: parsed.data.ticketId,
    companyId: ticket.company_id,
    metadata: { subject: ticket.subject, ...patch },
  });

  revalidatePath("/super-admin/support");
  return { success: true, data: undefined };
}

export async function seedPlatformLogAction(
  level: "info" | "warn" | "error",
  message: string,
): Promise<ActionResult<void>> {
  const guard = await guardPlatformAdminAction();
  if (!guard.ok) return { success: false, error: guard.error };
  const ctx = guard.ctx;
  await writePlatformLog({
    level,
    source: "platform.console",
    message,
    metadata: { actorId: ctx.userId },
  });
  revalidatePath("/super-admin/logs");
  return { success: true, data: undefined };
}
