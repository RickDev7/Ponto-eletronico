import "server-only";

import { createClient } from "@/lib/supabase/server";
import { gatherAiContext } from "@/lib/ai/gather-context";
import { runFallbackCapability, runFallbackChat } from "@/lib/ai/fallback-engine";
import { callOpenAiCapability, callOpenAiChat } from "@/lib/ai/provider";
import type { AiCapability, AiDomain, AiRunResult } from "@/lib/ai/types";

export async function runAiCapability(
  params: {
    companyId: string;
    companyName: string;
    domain: AiDomain;
    capability: AiCapability;
    locale: string;
    userId?: string | null;
  },
): Promise<AiRunResult> {
  const ctx = await gatherAiContext(
    params.companyId,
    params.companyName,
    params.domain,
    params.locale,
  );

  const llmResult = await callOpenAiCapability(params.capability, ctx);
  const provider = llmResult ? "openai" : "fallback";
  const result = llmResult ?? runFallbackCapability(params.capability, ctx);

  const insightId = await persistInsight({
    companyId: params.companyId,
    domain: params.domain,
    capability: params.capability,
    prompt: params.capability,
    result,
    provider,
    userId: params.userId,
  });

  return {
    capability: params.capability,
    domain: params.domain,
    provider,
    result,
    insightId,
  };
}

export async function runAiChat(
  params: {
    companyId: string;
    companyName: string;
    domain: AiDomain;
    message: string;
    locale: string;
    userId?: string | null;
  },
): Promise<AiRunResult> {
  const ctx = await gatherAiContext(
    params.companyId,
    params.companyName,
    params.domain,
    params.locale,
  );

  const llmResult = await callOpenAiChat(params.message, ctx);
  const provider = llmResult ? "openai" : "fallback";
  const result = llmResult ?? runFallbackChat(params.message, ctx);

  const insightId = await persistInsight({
    companyId: params.companyId,
    domain: params.domain,
    capability: "analyze_productivity",
    prompt: params.message,
    result,
    provider,
    userId: params.userId,
  });

  return {
    capability: "analyze_productivity",
    domain: params.domain,
    provider,
    result,
    insightId,
  };
}

async function persistInsight(params: {
  companyId: string;
  domain: AiDomain;
  capability: string;
  prompt: string;
  result: unknown;
  provider: string;
  userId?: string | null;
}): Promise<string | undefined> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("ai_insights")
      .insert({
        company_id: params.companyId,
        domain: params.domain,
        capability: params.capability,
        prompt: params.prompt.slice(0, 2000),
        result: params.result as Record<string, unknown>,
        provider: params.provider,
        created_by: params.userId ?? null,
      })
      .select("id")
      .single();
    return data?.id;
  } catch {
    return undefined;
  }
}

export async function loadRecentAiInsights(companyId: string, limit = 10) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ai_insights")
    .select("id, domain, capability, result, provider, created_at")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(limit);

  return data ?? [];
}
