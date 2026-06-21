"use server";

import { revalidatePath } from "next/cache";
import { requireCompanyContext } from "@/lib/auth/guards";
import { updateLeadStatusAction } from "@/actions/crm/actions";
import { updateQuoteStatusAction } from "@/actions/finance/actions";
import type { ActionResult } from "@/actions/auth/actions";

function commercialPaths(slug: string) {
  return [
    `/${slug}/commercial`,
    `/${slug}/commercial/pipeline`,
    `/${slug}/crm`,
    `/${slug}/crm/leads`,
    `/${slug}/crm/pipeline`,
    `/${slug}/finance/quotes`,
    `/${slug}/finance/contracts`,
    `/${slug}/clients`,
  ];
}

function revalidateCommercial(slug: string) {
  for (const path of commercialPaths(slug)) {
    revalidatePath(path);
  }
}

/** Qualify a lead (workflow: Lead → Qualification). */
export async function qualifyLeadAction(
  slug: string,
  leadId: string,
): Promise<ActionResult<{ clientId?: string }>> {
  await requireCompanyContext({ slug, minRole: "supervisor", permission: "commercial:write" });
  const result = await updateLeadStatusAction(slug, leadId, "qualified");
  if (result.success) revalidateCommercial(slug);
  return result;
}

/** Send quote for internal approval (workflow: Quote → Approval). */
export async function submitQuoteForApprovalAction(
  slug: string,
  quoteId: string,
): Promise<ActionResult> {
  await requireCompanyContext({ slug, minRole: "supervisor", permission: "commercial:write" });
  const result = await updateQuoteStatusAction(slug, quoteId, "under_review");
  if (result.success) revalidateCommercial(slug);
  return result;
}

/** Approve quote — triggers lead conversion when linked (workflow: Approval → Contract path). */
export async function approveQuoteAction(
  slug: string,
  quoteId: string,
): Promise<ActionResult<{ clientId?: string }>> {
  await requireCompanyContext({ slug, minRole: "supervisor", permission: "commercial:write" });
  const result = await updateQuoteStatusAction(slug, quoteId, "accepted");
  if (!result.success) return result;
  revalidateCommercial(slug);
  return { success: true, data: {} };
}
