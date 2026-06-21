"use server";

import { revalidatePath } from "next/cache";
import { requireCompanyContext } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { emitAutomationEvent } from "@/lib/automations/engine";
import { createClientAction } from "@/actions/clients/actions";
import {
  createLeadSchema,
  createLeadContactSchema,
  leadStatusSchema,
  type CreateLeadInput,
  type CreateLeadContactInput,
  type LeadStatus,
} from "@/lib/validations/crm";
import type { ActionResult } from "@/actions/auth/actions";

function crmPaths(slug: string) {
  return [
    `/${slug}/commercial`,
    `/${slug}/commercial/pipeline`,
    `/${slug}/crm`,
    `/${slug}/crm/leads`,
    `/${slug}/crm/pipeline`,
    `/${slug}/crm/contacts`,
    `/${slug}/crm/companies`,
    `/${slug}/clients`,
    `/${slug}/finance`,
    `/${slug}/finance/quotes`,
    `/${slug}/finance/contracts`,
  ];
}

function revalidateCrm(slug: string) {
  for (const path of crmPaths(slug)) {
    revalidatePath(path);
  }
  revalidatePath(`/${slug}/crm`, "layout");
}

type LeadEventType =
  | "created"
  | "updated"
  | "contacted"
  | "qualified"
  | "quote_sent"
  | "negotiation"
  | "won"
  | "lost"
  | "client_converted"
  | "contract_created"
  | "comment";

async function logLeadEvent(
  supabase: Awaited<ReturnType<typeof createClient>>,
  params: {
    companyId: string;
    leadId: string;
    eventType: LeadEventType;
    createdBy?: string | null;
    message?: string;
    metadata?: Record<string, unknown>;
  },
) {
  await supabase.from("lead_events").insert({
    company_id: params.companyId,
    lead_id: params.leadId,
    event_type: params.eventType,
    message: params.message ?? null,
    metadata: params.metadata ?? {},
    created_by: params.createdBy ?? null,
  });
}

async function convertLeadToClientInternal(
  slug: string,
  leadId: string,
  ctx: Awaited<ReturnType<typeof requireCompanyContext>>,
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<ActionResult<{ clientId: string }>> {
  const { data: lead } = await supabase
    .from("leads")
    .select("*, contacts:lead_contacts(*)")
    .eq("id", leadId)
    .eq("company_id", ctx.company.id)
    .single();

  if (!lead) return { success: false, error: "Lead not found" };
  if (lead.converted_client_id) {
    return { success: true, data: { clientId: lead.converted_client_id } };
  }

  const contacts = (lead.contacts as Array<{
    name: string;
    email: string | null;
    phone: string | null;
    is_primary: boolean;
  }>) ?? [];
  const primary = contacts.find((c) => c.is_primary) ?? contacts[0];

  const clientResult = await createClientAction(slug, {
    name: lead.company_name,
    contactName: primary?.name ?? lead.contact_name ?? undefined,
    email: primary?.email ?? lead.email ?? undefined,
    phone: primary?.phone ?? lead.phone ?? undefined,
    notes: lead.notes ?? undefined,
    sourceLeadId: leadId,
  });

  if (!clientResult.success) return clientResult;

  const clientId = clientResult.data.id;

  await supabase
    .from("quotes")
    .update({ client_id: clientId })
    .eq("lead_id", leadId)
    .eq("company_id", ctx.company.id)
    .is("client_id", null);

  await supabase
    .from("leads")
    .update({
      converted_client_id: clientId,
      status: "won",
    })
    .eq("id", leadId)
    .eq("company_id", ctx.company.id);

  await logLeadEvent(supabase, {
    companyId: ctx.company.id,
    leadId,
    eventType: "client_converted",
    createdBy: ctx.profile.id,
    message: clientId,
  });

  void emitAutomationEvent({
    companyId: ctx.company.id,
    slug,
    trigger: "lead.won",
    payload: {
      leadId,
      clientId,
      estimatedValueCents: lead.estimated_value_cents,
      companyName: lead.company_name,
      entityType: "lead",
      entityId: leadId,
    },
  }).catch(() => undefined);

  return { success: true, data: { clientId } };
}

export async function createLeadAction(
  slug: string,
  input: CreateLeadInput,
): Promise<ActionResult<{ id: string }>> {
  const ctx = await requireCompanyContext({ slug, minRole: "supervisor" });
  const parsed = createLeadSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leads")
    .insert({
      company_id: ctx.company.id,
      company_name: parsed.data.companyName,
      contact_name: parsed.data.contactName ?? null,
      email: parsed.data.email || null,
      phone: parsed.data.phone ?? null,
      website: parsed.data.website ?? null,
      city: parsed.data.city ?? null,
      country: parsed.data.country ?? "DE",
      estimated_value_cents: parsed.data.estimatedValueCents ?? 0,
      notes: parsed.data.notes ?? null,
      owner_id: parsed.data.ownerId ?? ctx.profile.id,
      status: parsed.data.status ?? "new",
    })
    .select("id")
    .single();

  if (error || !data) return { success: false, error: error?.message ?? "Failed" };

  if (parsed.data.contactName) {
    await supabase.from("lead_contacts").insert({
      company_id: ctx.company.id,
      lead_id: data.id,
      name: parsed.data.contactName,
      email: parsed.data.email || null,
      phone: parsed.data.phone ?? null,
      is_primary: true,
    });
  }

  await logLeadEvent(supabase, {
    companyId: ctx.company.id,
    leadId: data.id,
    eventType: "created",
    createdBy: ctx.profile.id,
  });

  revalidateCrm(slug);
  return { success: true, data: { id: data.id } };
}

export async function updateLeadAction(
  slug: string,
  leadId: string,
  input: CreateLeadInput,
): Promise<ActionResult> {
  const ctx = await requireCompanyContext({ slug, minRole: "supervisor" });
  const parsed = createLeadSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  }

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("leads")
    .select("converted_client_id")
    .eq("id", leadId)
    .eq("company_id", ctx.company.id)
    .single();

  if (!existing) return { success: false, error: "Lead not found" };
  if (existing.converted_client_id) {
    return { success: false, error: "Converted leads are read-only" };
  }

  const { error } = await supabase
    .from("leads")
    .update({
      company_name: parsed.data.companyName,
      contact_name: parsed.data.contactName ?? null,
      email: parsed.data.email || null,
      phone: parsed.data.phone ?? null,
      website: parsed.data.website ?? null,
      city: parsed.data.city ?? null,
      country: parsed.data.country ?? "DE",
      estimated_value_cents: parsed.data.estimatedValueCents ?? 0,
      notes: parsed.data.notes ?? null,
      owner_id: parsed.data.ownerId ?? undefined,
    })
    .eq("id", leadId)
    .eq("company_id", ctx.company.id);

  if (error) return { success: false, error: error.message };

  await logLeadEvent(supabase, {
    companyId: ctx.company.id,
    leadId,
    eventType: "updated",
    createdBy: ctx.profile.id,
  });

  revalidateCrm(slug);
  return { success: true, data: undefined };
}

export async function updateLeadStatusAction(
  slug: string,
  leadId: string,
  status: LeadStatus,
): Promise<ActionResult<{ clientId?: string }>> {
  const ctx = await requireCompanyContext({ slug, minRole: "supervisor" });
  const parsed = leadStatusSchema.safeParse(status);
  if (!parsed.success) return { success: false, error: "Invalid status" };

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("leads")
    .select("converted_client_id, status, estimated_value_cents, company_name")
    .eq("id", leadId)
    .eq("company_id", ctx.company.id)
    .single();

  if (!existing) return { success: false, error: "Lead not found" };
  if (existing.converted_client_id && parsed.data !== "won") {
    return { success: false, error: "Converted leads cannot change status" };
  }

  const { error } = await supabase
    .from("leads")
    .update({ status: parsed.data })
    .eq("id", leadId)
    .eq("company_id", ctx.company.id);

  if (error) return { success: false, error: error.message };

  const eventMap: Partial<Record<LeadStatus, LeadEventType>> = {
    contacted: "contacted",
    qualified: "qualified",
    proposal_sent: "quote_sent",
    negotiation: "negotiation",
    won: "won",
    lost: "lost",
  };

  await logLeadEvent(supabase, {
    companyId: ctx.company.id,
    leadId,
    eventType: eventMap[parsed.data] ?? "updated",
    createdBy: ctx.profile.id,
    message: parsed.data,
  });

  void emitAutomationEvent({
    companyId: ctx.company.id,
    slug,
    trigger: "lead.status_changed",
    payload: {
      leadId,
      status: parsed.data,
      previousStatus: existing.status,
      companyName: existing.company_name,
      entityType: "lead",
      entityId: leadId,
    },
  }).catch(() => undefined);

  if (parsed.data === "qualified") {
    void emitAutomationEvent({
      companyId: ctx.company.id,
      slug,
      trigger: "lead.qualified",
      payload: {
        leadId,
        companyName: existing.company_name,
        estimatedValueCents: existing.estimated_value_cents,
        entityType: "lead",
        entityId: leadId,
      },
    }).catch(() => undefined);
  }

  let clientId: string | undefined;
  if (parsed.data === "won") {
    const conversion = await convertLeadToClientInternal(slug, leadId, ctx, supabase);
    if (conversion.success) clientId = conversion.data.clientId;
    else return conversion;
  }

  revalidateCrm(slug);
  return { success: true, data: { clientId } };
}

export async function deleteLeadAction(slug: string, leadId: string): Promise<ActionResult> {
  const ctx = await requireCompanyContext({ slug, minRole: "supervisor" });
  const supabase = await createClient();

  const { data: lead } = await supabase
    .from("leads")
    .select("converted_client_id, status")
    .eq("id", leadId)
    .eq("company_id", ctx.company.id)
    .single();

  if (!lead) return { success: false, error: "Lead not found" };
  if (lead.converted_client_id || lead.status === "won") {
    return { success: false, error: "Cannot delete converted leads" };
  }

  const { error } = await supabase
    .from("leads")
    .delete()
    .eq("id", leadId)
    .eq("company_id", ctx.company.id);

  if (error) return { success: false, error: error.message };
  revalidateCrm(slug);
  return { success: true, data: undefined };
}

export async function createLeadContactAction(
  slug: string,
  input: CreateLeadContactInput,
): Promise<ActionResult<{ id: string }>> {
  const ctx = await requireCompanyContext({ slug, minRole: "supervisor" });
  const parsed = createLeadContactSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  }

  const supabase = await createClient();

  if (parsed.data.isPrimary) {
    await supabase
      .from("lead_contacts")
      .update({ is_primary: false })
      .eq("lead_id", parsed.data.leadId)
      .eq("company_id", ctx.company.id);
  }

  const { data, error } = await supabase
    .from("lead_contacts")
    .insert({
      company_id: ctx.company.id,
      lead_id: parsed.data.leadId,
      name: parsed.data.name,
      email: parsed.data.email || null,
      phone: parsed.data.phone ?? null,
      role_title: parsed.data.roleTitle ?? null,
      is_primary: parsed.data.isPrimary,
    })
    .select("id")
    .single();

  if (error || !data) return { success: false, error: error?.message ?? "Failed" };
  revalidateCrm(slug);
  return { success: true, data: { id: data.id } };
}

export async function linkQuoteToLeadAction(
  slug: string,
  leadId: string,
  quoteId: string,
): Promise<ActionResult> {
  const ctx = await requireCompanyContext({ slug, minRole: "supervisor" });
  const supabase = await createClient();

  await supabase
    .from("quotes")
    .update({ lead_id: leadId })
    .eq("id", quoteId)
    .eq("company_id", ctx.company.id);

  await supabase
    .from("leads")
    .update({ converted_quote_id: quoteId, status: "proposal_sent" })
    .eq("id", leadId)
    .eq("company_id", ctx.company.id)
    .is("converted_client_id", null);

  await logLeadEvent(supabase, {
    companyId: ctx.company.id,
    leadId,
    eventType: "quote_sent",
    createdBy: ctx.profile.id,
    message: quoteId,
  });

  revalidateCrm(slug);
  return { success: true, data: undefined };
}

export async function onQuoteAcceptedForLeadAction(
  slug: string,
  quoteId: string,
): Promise<ActionResult<{ leadId?: string; clientId?: string }>> {
  const ctx = await requireCompanyContext({ slug, minRole: "supervisor" });
  const supabase = await createClient();

  const { data: quote } = await supabase
    .from("quotes")
    .select("lead_id")
    .eq("id", quoteId)
    .eq("company_id", ctx.company.id)
    .single();

  if (!quote?.lead_id) return { success: true, data: {} };

  const result = await updateLeadStatusAction(slug, quote.lead_id, "won");
  if (!result.success) return result;
  return { success: true, data: { leadId: quote.lead_id, clientId: result.data?.clientId } };
}
