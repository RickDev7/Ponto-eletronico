"use server";

import { getLocale } from "next-intl/server";
import { z } from "zod";
import { requireEmployeeContext } from "@/lib/auth/guards";
import { loadFieldJobAiContext } from "@/lib/ai/load-field-job-context";
import { runFieldJobFallback } from "@/lib/ai/field-job-fallback";
import { callOpenAiFieldJob } from "@/lib/ai/field-job-provider";
import type { FieldJobAiCapability, FieldJobAiResult } from "@/lib/ai/field-job-types";
import type { ActionResult } from "@/actions/auth/actions";

const requestSchema = z.object({
  taskId: z.string().uuid(),
  capability: z.enum(["suggest_checklist", "suggest_materials", "generate_service_notes"]),
});

export async function runEmployeeFieldAiAction(
  slug: string,
  raw: unknown,
): Promise<ActionResult<FieldJobAiResult>> {
  const ctx = await requireEmployeeContext(slug);
  const parsed = requestSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: "Pedido inválido" };
  }

  const appLocale = await getLocale();
  const locale = appLocale.startsWith("en") ? "en-US" : "pt-BR";

  const jobCtx = await loadFieldJobAiContext(
    ctx.company.id,
    ctx.company.name,
    ctx.employee.id,
    parsed.data.taskId,
    locale,
  );

  if (!jobCtx) {
    return { success: false, error: "Serviço não encontrado ou sem permissão" };
  }

  const capability = parsed.data.capability as FieldJobAiCapability;
  const llmResult = await callOpenAiFieldJob(capability, jobCtx);
  const result = llmResult ?? runFieldJobFallback(capability, jobCtx);

  return { success: true, data: result };
}

export async function getEmployeeAiStatusAction(): Promise<{ configured: boolean }> {
  const { isAiProviderConfigured } = await import("@/lib/ai/provider");
  return { configured: isAiProviderConfigured() };
}
