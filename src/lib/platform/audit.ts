import "server-only";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function writePlatformAudit(params: {
  actorId: string;
  action: string;
  targetType: string;
  targetId?: string;
  companyId?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    const supabase = await createClient();
    await supabase.from("platform_audit_logs").insert({
      actor_id: params.actorId,
      action: params.action,
      target_type: params.targetType,
      target_id: params.targetId ?? null,
      company_id: params.companyId ?? null,
      metadata: params.metadata ?? {},
    });
  } catch {
    // Non-blocking audit
  }
}

export async function writePlatformLog(params: {
  level: "debug" | "info" | "warn" | "error";
  source: string;
  message: string;
  companyId?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from("platform_logs").insert({
      level: params.level,
      source: params.source,
      message: params.message,
      company_id: params.companyId ?? null,
      metadata: params.metadata ?? {},
    });
  } catch {
    // Non-blocking logging
  }
}

export async function isFeatureEnabled(
  key: string,
  companyId?: string,
  planKey?: string,
): Promise<boolean> {
  const supabase = await createClient();

  if (companyId) {
    const { data: tenantFlag } = await supabase
      .from("feature_flags")
      .select("enabled")
      .eq("key", key)
      .eq("company_id", companyId)
      .maybeSingle();
    if (tenantFlag) return tenantFlag.enabled;
  }

  if (planKey) {
    const { data: planFlag } = await supabase
      .from("feature_flags")
      .select("enabled")
      .eq("key", key)
      .is("company_id", null)
      .eq("plan_key", planKey)
      .maybeSingle();
    if (planFlag) return planFlag.enabled;
  }

  const { data: globalFlag } = await supabase
    .from("feature_flags")
    .select("enabled")
    .eq("key", key)
    .is("company_id", null)
    .is("plan_key", null)
    .maybeSingle();

  return globalFlag?.enabled ?? false;
}
