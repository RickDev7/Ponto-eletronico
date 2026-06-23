import "server-only";

import type {
  FieldJobAiCapability,
  FieldJobAiContext,
  FieldJobAiResult,
} from "@/lib/ai/field-job-types";
import { isAiProviderConfigured } from "@/lib/ai/provider";

const CAPABILITY_PROMPTS: Record<FieldJobAiCapability, string> = {
  suggest_checklist:
    "Suggest a practical field checklist (5-8 steps) for this job. Avoid duplicating existing checklist items. Return checklistItems array of strings.",
  suggest_materials:
    "Suggest materials and quantities needed for this field job. Return materials array with name, quantity, optional note.",
  generate_service_notes:
    "Generate professional service completion notes in Portuguese for the employee to use at checkout. Return serviceNotes as multi-line string.",
};

function contextBlock(ctx: FieldJobAiContext): string {
  return JSON.stringify(
    {
      task: ctx.task,
      existingChecklist: ctx.existingChecklist,
      templateChecklists: ctx.templateChecklists,
      linkedMaterials: ctx.linkedMaterials,
    },
    null,
    2,
  );
}

function parseFieldJobJson(
  capability: FieldJobAiCapability,
  content: string,
): FieldJobAiResult | null {
  try {
    const cleaned = content.replace(/```json\n?|\n?```/g, "").trim();
    const parsed = JSON.parse(cleaned) as Partial<FieldJobAiResult>;
    if (!parsed.summary) return null;
    return {
      capability,
      provider: "openai",
      summary: parsed.summary,
      recommendations: parsed.recommendations ?? [],
      checklistItems: parsed.checklistItems,
      materials: parsed.materials,
      serviceNotes: parsed.serviceNotes,
    };
  } catch {
    return null;
  }
}

export async function callOpenAiFieldJob(
  capability: FieldJobAiCapability,
  ctx: FieldJobAiContext,
): Promise<FieldJobAiResult | null> {
  if (!isAiProviderConfigured()) return null;

  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
  const lang = ctx.locale.startsWith("en") ? "English" : "Portuguese (pt-PT)";

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.35,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are FeldOps Field Assistant for mobile employees. Respond ONLY with valid JSON:
{
  "summary": "string",
  "recommendations": ["string"],
  "checklistItems": ["string"] (optional),
  "materials": [{"name":"string","quantity":"string","note":"string"}] (optional),
  "serviceNotes": "string" (optional)
}
Language: ${lang}. Be practical and concise for field workers.`,
        },
        {
          role: "user",
          content: `Task: ${CAPABILITY_PROMPTS[capability]}\n\nJob context:\n${contextBlock(ctx)}`,
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
  return parseFieldJobJson(capability, content);
}
