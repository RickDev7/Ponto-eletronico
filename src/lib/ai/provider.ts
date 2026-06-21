import "server-only";

import type { AiCapability, AiCompanyContext, AiStructuredResult } from "@/lib/ai/types";
import { contextToPromptBlock } from "@/lib/ai/gather-context";

const CAPABILITY_INSTRUCTIONS: Record<AiCapability, string> = {
  optimize_schedules:
    "Analyze the schedule data and suggest concrete optimizations: task redistribution, grouping by geography, filling open shifts. Return actionable items.",
  suggest_workforce_allocation:
    "Suggest how to allocate employees to shifts and tasks. Consider utilization, vacations, and workload balance.",
  estimate_costs:
    "Estimate operational costs: labor, outstanding receivables, MRR. Provide EUR amounts and margin recommendations.",
  predict_delays:
    "Predict which operations are at risk of delay. Score risk and list mitigations.",
  generate_quotes:
    "Generate a professional quote draft in Portuguese with line items, subtotal, tax, total. Use realistic prices from contract data.",
  generate_reports:
    "Generate an executive operational report with KPIs, risks, and recommendations.",
  analyze_productivity:
    "Analyze team productivity: completion rate, on-time delivery, utilization. Compare to benchmarks.",
};

function isAiConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

function buildSystemPrompt(capability: AiCapability | "chat"): string {
  const base = `You are FeldOps AI Operations Assistant. Respond ONLY with valid JSON matching this schema:
{
  "summary": "string (2-3 sentences)",
  "insights": [{"title":"string","description":"string","priority":"high|medium|low","metric":"optional string"}],
  "recommendations": ["string"],
  "metrics": {"key": "value"},
  "generatedContent": "optional string for quotes/reports"
}
Use Portuguese (pt-BR) unless locale is en. Be specific with numbers from the context.`;

  if (capability === "chat") {
    return `${base}\nAnswer the user's question using company data.`;
  }
  return `${base}\nTask: ${CAPABILITY_INSTRUCTIONS[capability]}`;
}

function parseAiJson(content: string): AiStructuredResult | null {
  try {
    const cleaned = content.replace(/```json\n?|\n?```/g, "").trim();
    const parsed = JSON.parse(cleaned) as AiStructuredResult;
    if (!parsed.summary) return null;
    return {
      summary: parsed.summary,
      insights: parsed.insights ?? [],
      recommendations: parsed.recommendations ?? [],
      metrics: parsed.metrics,
      generatedContent: parsed.generatedContent,
    };
  } catch {
    return null;
  }
}

export async function callOpenAiCapability(
  capability: AiCapability,
  ctx: AiCompanyContext,
): Promise<AiStructuredResult | null> {
  if (!isAiConfigured()) return null;

  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: buildSystemPrompt(capability) },
        {
          role: "user",
          content: `Company context:\n${contextToPromptBlock(ctx)}\n\nCapability: ${capability}`,
        },
      ],
    }),
  });

  if (!response.ok) return null;

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) return null;
  return parseAiJson(content);
}

export async function callOpenAiChat(
  message: string,
  ctx: AiCompanyContext,
): Promise<AiStructuredResult | null> {
  if (!isAiConfigured()) return null;

  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: buildSystemPrompt("chat") },
        {
          role: "user",
          content: `Company context:\n${contextToPromptBlock(ctx)}\n\nUser question: ${message}`,
        },
      ],
    }),
  });

  if (!response.ok) return null;

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) return null;
  return parseAiJson(content);
}

export function isAiProviderConfigured(): boolean {
  return isAiConfigured();
}
