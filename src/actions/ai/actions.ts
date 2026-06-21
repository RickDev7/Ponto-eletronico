"use server";

import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { z } from "zod";
import { requireCompanyContext } from "@/lib/auth/guards";
import { requirePermission } from "@/config/permissions";
import { runAiCapability, runAiChat } from "@/lib/ai/run-capability";
import { isAiProviderConfigured } from "@/lib/ai/provider";
import type { AiCapability, AiDomain, AiRunResult } from "@/lib/ai/types";
import type { ActionResult } from "@/actions/auth/actions";

const capabilitySchema = z.object({
  capability: z.enum([
    "optimize_schedules",
    "suggest_workforce_allocation",
    "estimate_costs",
    "predict_delays",
    "generate_quotes",
    "generate_reports",
    "analyze_productivity",
  ]),
  domain: z.enum([
    "operations",
    "workforce",
    "finance",
    "analytics",
    "commercial",
    "tasks",
    "reports",
    "automations",
    "portal",
    "general",
  ]),
});

const chatSchema = z.object({
  message: z.string().min(2).max(2000),
  domain: capabilitySchema.shape.domain,
});

export async function runAiCapabilityAction(
  slug: string,
  raw: unknown,
): Promise<ActionResult<AiRunResult>> {
  const ctx = await requireCompanyContext({ slug, minRole: "supervisor" });
  requirePermission(ctx.membership.role, "ai:read");

  const parsed = capabilitySchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: "Invalid capability request" };
  }

  const appLocale = await getLocale();
  const locale = appLocale.startsWith("en") ? "en-US" : "pt-BR";
  const result = await runAiCapability({
    companyId: ctx.company.id,
    companyName: ctx.company.name,
    domain: parsed.data.domain as AiDomain,
    capability: parsed.data.capability as AiCapability,
    locale,
    userId: ctx.profile.id,
  });

  revalidatePath(`/${slug}/assistant`);
  return { success: true, data: result };
}

export async function askAiAssistantAction(
  slug: string,
  raw: unknown,
): Promise<ActionResult<AiRunResult>> {
  const ctx = await requireCompanyContext({ slug, minRole: "supervisor" });
  requirePermission(ctx.membership.role, "ai:read");

  const parsed = chatSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: "Invalid message" };
  }

  const appLocale = await getLocale();
  const locale = appLocale.startsWith("en") ? "en-US" : "pt-BR";
  const result = await runAiChat({
    companyId: ctx.company.id,
    companyName: ctx.company.name,
    domain: parsed.data.domain as AiDomain,
    message: parsed.data.message,
    locale,
    userId: ctx.profile.id,
  });

  revalidatePath(`/${slug}/assistant`);
  return { success: true, data: result };
}

export async function getAiStatusAction(): Promise<{
  configured: boolean;
}> {
  return { configured: isAiProviderConfigured() };
}
