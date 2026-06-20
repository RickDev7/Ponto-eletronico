"use server";

import { revalidatePath } from "next/cache";
import { requireCompanyContext } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { nextDocumentNumber } from "@/lib/finance/numbers";
import {
  calculateLineTotal,
  calculateTotals,
  getMonthRange,
  monthKey,
  type ContractStatus,
} from "@/lib/finance/utils";
import {
  createContractSchema,
  createInvoiceSchema,
  createPaymentSchema,
  createQuoteSchema,
  contractStatusSchema,
  updateQuoteSchema,
  type CreateContractInput,
  type CreateInvoiceInput,
  type CreatePaymentInput,
  type CreateQuoteInput,
  type UpdateQuoteInput,
} from "@/lib/validations/finance";
import type { ActionResult } from "@/actions/auth/actions";
import { linkQuoteToLeadAction, onQuoteAcceptedForLeadAction } from "@/actions/crm/actions";
import { generateTasksFromContractAction } from "@/actions/operations/actions";
import { emitAutomationEvent } from "@/lib/automations/engine";

function financePaths(slug: string) {
  return [
    `/${slug}/finance`,
    `/${slug}/finance/quotes`,
    `/${slug}/finance/contracts`,
    `/${slug}/finance/invoices`,
    `/${slug}/finance/payments`,
    `/${slug}/finance/cashflow`,
  ];
}

function revalidateFinance(slug: string) {
  for (const path of financePaths(slug)) {
    revalidatePath(path);
  }
  revalidatePath(`/${slug}/finance/quotes`, "layout");
  revalidatePath(`/${slug}/finance/contracts`, "layout");
}

type QuoteEventType =
  | "created"
  | "updated"
  | "sent"
  | "viewed"
  | "accepted"
  | "rejected"
  | "duplicated"
  | "converted"
  | "deleted";

async function logQuoteEvent(
  supabase: Awaited<ReturnType<typeof createClient>>,
  params: {
    companyId: string;
    quoteId: string;
    eventType: QuoteEventType;
    createdBy?: string | null;
    message?: string;
  },
) {
  await supabase.from("quote_events").insert({
    company_id: params.companyId,
    quote_id: params.quoteId,
    event_type: params.eventType,
    message: params.message ?? null,
    created_by: params.createdBy ?? null,
  });
}

function mapQuoteItems(input: CreateQuoteInput["items"]) {
  return input.map((item) => ({
    ...item,
    lineTotalCents: calculateLineTotal(
      item.quantity,
      item.unitPriceCents,
      item.discountPercent ?? 0,
    ),
  }));
}

function buildQuoteInsertFields(
  parsed: CreateQuoteInput,
  totals: ReturnType<typeof calculateTotals>,
  ctx: Awaited<ReturnType<typeof requireCompanyContext>>,
  quoteNumber: string,
) {
  return {
    company_id: ctx.company.id,
    client_id: parsed.clientId ?? null,
    quote_number: quoteNumber,
    status: "draft" as const,
    client_name: parsed.clientName,
    client_company: parsed.clientCompany ?? null,
    client_email: parsed.clientEmail || null,
    client_phone: parsed.clientPhone ?? null,
    client_address: parsed.clientAddress ?? null,
    issue_date: parsed.issueDate ?? new Date().toISOString().slice(0, 10),
    valid_until: parsed.validUntil ?? null,
    payment_terms: parsed.paymentTerms ?? null,
    subtotal_cents: totals.subtotalCents,
    discount_cents: totals.discountCents,
    tax_rate: totals.taxRate,
    tax_cents: totals.taxCents,
    total_cents: totals.totalCents,
    notes: parsed.notes ?? null,
    internal_notes: parsed.internalNotes ?? null,
    signature_text: parsed.signatureText ?? null,
    assigned_to: parsed.assignedTo ?? ctx.profile.id,
    created_by: ctx.profile.id,
    lead_id: parsed.leadId ?? null,
  };
}

export interface FinanceOverview {
  monthlyRevenueCents: number;
  projectedRevenueCents: number;
  pendingInvoicesCount: number;
  pendingInvoicesCents: number;
  overdueInvoicesCount: number;
  overdueInvoicesCents: number;
  receivedThisMonthCents: number;
  openQuotesCount: number;
  openQuotesCents: number;
}

export async function getFinanceOverview(slug: string): Promise<FinanceOverview> {
  const ctx = await requireCompanyContext({ slug, minRole: "supervisor" });
  const supabase = await createClient();
  const companyId = ctx.company.id;
  const now = new Date();
  const { start: monthStart, end: monthEnd } = getMonthRange(monthKey(now));

  const [
    { data: monthInvoices },
    { data: pendingInvoices },
    { data: overdueInvoices },
    { data: monthPayments },
    { data: openQuotes },
    { data: activeContracts },
  ] = await Promise.all([
    supabase
      .from("invoices")
      .select("total_cents, status")
      .eq("company_id", companyId)
      .gte("issue_date", monthStart)
      .lte("issue_date", monthEnd)
      .in("status", ["sent", "paid", "partial"]),
    supabase
      .from("invoices")
      .select("total_cents, amount_paid_cents")
      .eq("company_id", companyId)
      .in("status", ["sent", "partial"]),
    supabase
      .from("invoices")
      .select("total_cents, amount_paid_cents")
      .eq("company_id", companyId)
      .eq("status", "overdue"),
    supabase
      .from("payments")
      .select("amount_cents")
      .eq("company_id", companyId)
      .gte("payment_date", monthStart)
      .lte("payment_date", monthEnd),
    supabase
      .from("quotes")
      .select("total_cents")
      .eq("company_id", companyId)
      .in("status", ["draft", "sent"]),
    supabase
      .from("contracts")
      .select("amount_cents")
      .eq("company_id", companyId)
      .eq("is_active", true),
  ]);

  const monthlyRevenueCents =
    monthInvoices?.reduce((s, i) => s + (i.total_cents ?? 0), 0) ?? 0;
  const pendingInvoicesCents =
    pendingInvoices?.reduce(
      (s, i) => s + ((i.total_cents ?? 0) - (i.amount_paid_cents ?? 0)),
      0,
    ) ?? 0;
  const overdueInvoicesCents =
    overdueInvoices?.reduce(
      (s, i) => s + ((i.total_cents ?? 0) - (i.amount_paid_cents ?? 0)),
      0,
    ) ?? 0;

  return {
    monthlyRevenueCents,
    projectedRevenueCents:
      activeContracts?.reduce((s, c) => s + (c.amount_cents ?? 0), 0) ?? 0,
    pendingInvoicesCount: pendingInvoices?.length ?? 0,
    pendingInvoicesCents,
    overdueInvoicesCount: overdueInvoices?.length ?? 0,
    overdueInvoicesCents,
    receivedThisMonthCents:
      monthPayments?.reduce((s, p) => s + (p.amount_cents ?? 0), 0) ?? 0,
    openQuotesCount: openQuotes?.length ?? 0,
    openQuotesCents: openQuotes?.reduce((s, q) => s + (q.total_cents ?? 0), 0) ?? 0,
  };
}

export async function createQuoteAction(
  slug: string,
  input: CreateQuoteInput,
): Promise<ActionResult<{ id: string }>> {
  const ctx = await requireCompanyContext({ slug, minRole: "supervisor" });
  const parsed = createQuoteSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  }

  const supabase = await createClient();
  const items = mapQuoteItems(parsed.data.items);
  const totals = calculateTotals(items, parsed.data.taxRate, parsed.data.discountCents ?? 0);
  const quoteNumber = await nextDocumentNumber(supabase, ctx.company.id, "quote");

  const { data: quote, error } = await supabase
    .from("quotes")
    .insert(buildQuoteInsertFields(parsed.data, totals, ctx, quoteNumber))
    .select("id")
    .single();

  if (error || !quote) return { success: false, error: error?.message ?? "Failed" };

  const { error: itemsError } = await supabase.from("quote_items").insert(
    items.map((item, index) => ({
      company_id: ctx.company.id,
      quote_id: quote.id,
      description: item.description,
      quantity: item.quantity,
      unit_price_cents: item.unitPriceCents,
      discount_percent: item.discountPercent ?? 0,
      line_total_cents: item.lineTotalCents,
      sort_order: index,
    })),
  );

  if (itemsError) return { success: false, error: itemsError.message };
  await logQuoteEvent(supabase, {
    companyId: ctx.company.id,
    quoteId: quote.id,
    eventType: "created",
    createdBy: ctx.profile.id,
  });

  if (parsed.data.leadId) {
    await linkQuoteToLeadAction(slug, parsed.data.leadId, quote.id);
  }

  revalidateFinance(slug);
  return { success: true, data: { id: quote.id } };
}

export async function updateQuoteAction(
  slug: string,
  quoteId: string,
  input: UpdateQuoteInput,
): Promise<ActionResult<{ id: string }>> {
  const ctx = await requireCompanyContext({ slug, minRole: "supervisor" });
  const parsed = updateQuoteSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  }

  const supabase = await createClient();
  const items = mapQuoteItems(parsed.data.items);
  const totals = calculateTotals(items, parsed.data.taxRate, parsed.data.discountCents ?? 0);

  const { error } = await supabase
    .from("quotes")
    .update({
      client_id: parsed.data.clientId ?? null,
      client_name: parsed.data.clientName,
      client_company: parsed.data.clientCompany ?? null,
      client_email: parsed.data.clientEmail || null,
      client_phone: parsed.data.clientPhone ?? null,
      client_address: parsed.data.clientAddress ?? null,
      issue_date: parsed.data.issueDate ?? new Date().toISOString().slice(0, 10),
      valid_until: parsed.data.validUntil ?? null,
      payment_terms: parsed.data.paymentTerms ?? null,
      subtotal_cents: totals.subtotalCents,
      discount_cents: totals.discountCents,
      tax_rate: totals.taxRate,
      tax_cents: totals.taxCents,
      total_cents: totals.totalCents,
      notes: parsed.data.notes ?? null,
      internal_notes: parsed.data.internalNotes ?? null,
      signature_text: parsed.data.signatureText ?? null,
      assigned_to: parsed.data.assignedTo ?? ctx.profile.id,
    })
    .eq("id", quoteId)
    .eq("company_id", ctx.company.id);

  if (error) return { success: false, error: error.message };

  await supabase.from("quote_items").delete().eq("quote_id", quoteId).eq("company_id", ctx.company.id);

  const { error: itemsError } = await supabase.from("quote_items").insert(
    items.map((item, index) => ({
      company_id: ctx.company.id,
      quote_id: quoteId,
      description: item.description,
      quantity: item.quantity,
      unit_price_cents: item.unitPriceCents,
      discount_percent: item.discountPercent ?? 0,
      line_total_cents: item.lineTotalCents,
      sort_order: index,
    })),
  );

  if (itemsError) return { success: false, error: itemsError.message };

  await logQuoteEvent(supabase, {
    companyId: ctx.company.id,
    quoteId,
    eventType: "updated",
    createdBy: ctx.profile.id,
  });
  revalidateFinance(slug);
  return { success: true, data: { id: quoteId } };
}

export async function deleteQuoteAction(
  slug: string,
  quoteId: string,
): Promise<ActionResult> {
  const ctx = await requireCompanyContext({ slug, minRole: "supervisor" });
  const supabase = await createClient();

  const { data: quote } = await supabase
    .from("quotes")
    .select("status")
    .eq("id", quoteId)
    .eq("company_id", ctx.company.id)
    .single();

  if (!quote) return { success: false, error: "Quote not found" };
  if (quote.status !== "draft") {
    return { success: false, error: "Only draft quotes can be deleted" };
  }

  const { error } = await supabase
    .from("quotes")
    .delete()
    .eq("id", quoteId)
    .eq("company_id", ctx.company.id);

  if (error) return { success: false, error: error.message };
  revalidateFinance(slug);
  return { success: true, data: undefined };
}

export async function duplicateQuoteAction(
  slug: string,
  quoteId: string,
): Promise<ActionResult<{ id: string }>> {
  const ctx = await requireCompanyContext({ slug, minRole: "supervisor" });
  const supabase = await createClient();

  const { data: quote } = await supabase
    .from("quotes")
    .select("*, items:quote_items(*)")
    .eq("id", quoteId)
    .eq("company_id", ctx.company.id)
    .single();

  if (!quote) return { success: false, error: "Quote not found" };

  const items = (quote.items as Array<{
    description: string;
    quantity: number;
    unit_price_cents: number;
    discount_percent?: number;
  }>) ?? [];

  const result = await createQuoteAction(slug, {
    clientId: quote.client_id,
    clientName: quote.client_name,
    clientCompany: quote.client_company ?? undefined,
    clientEmail: quote.client_email ?? "",
    clientPhone: quote.client_phone ?? undefined,
    clientAddress: quote.client_address ?? undefined,
    issueDate: quote.issue_date ?? undefined,
    validUntil: quote.valid_until ?? undefined,
    paymentTerms: quote.payment_terms ?? undefined,
    taxRate: Number(quote.tax_rate),
    discountCents: quote.discount_cents ?? 0,
    notes: quote.notes ?? undefined,
    internalNotes: quote.internal_notes ?? undefined,
    signatureText: quote.signature_text ?? undefined,
    assignedTo: quote.assigned_to ?? undefined,
    items: items.map((i) => ({
      description: i.description,
      quantity: Number(i.quantity),
      unitPriceCents: i.unit_price_cents,
      discountPercent: Number(i.discount_percent ?? 0),
    })),
  });

  if (result.success) {
    const supabase = await createClient();
    await logQuoteEvent(supabase, {
      companyId: ctx.company.id,
      quoteId,
      eventType: "duplicated",
      createdBy: ctx.profile.id,
    });
  }

  return result;
}

export async function updateQuoteStatusAction(
  slug: string,
  quoteId: string,
  status: "draft" | "sent" | "under_review" | "accepted" | "rejected" | "expired",
): Promise<ActionResult> {
  const ctx = await requireCompanyContext({ slug, minRole: "supervisor" });
  const supabase = await createClient();
  const { error } = await supabase
    .from("quotes")
    .update({ status })
    .eq("id", quoteId)
    .eq("company_id", ctx.company.id);
  if (error) return { success: false, error: error.message };

  const eventMap: Partial<Record<typeof status, QuoteEventType>> = {
    sent: "sent",
    under_review: "viewed",
    accepted: "accepted",
    rejected: "rejected",
  };
  const eventType = eventMap[status];
  if (eventType) {
    await logQuoteEvent(supabase, {
      companyId: ctx.company.id,
      quoteId,
      eventType,
      createdBy: ctx.profile.id,
    });
  }

  if (status === "accepted") {
    await onQuoteAcceptedForLeadAction(slug, quoteId);
  }

  revalidateFinance(slug);
  return { success: true, data: undefined };
}

export async function convertQuoteToContractAction(
  slug: string,
  quoteId: string,
): Promise<ActionResult<{ id: string }>> {
  const ctx = await requireCompanyContext({ slug, minRole: "supervisor" });
  const supabase = await createClient();
  const { data: quote } = await supabase
    .from("quotes")
    .select("*, items:quote_items(*)")
    .eq("id", quoteId)
    .eq("company_id", ctx.company.id)
    .single();

  if (!quote?.client_id) {
    return { success: false, error: "Quote must be linked to a client" };
  }

  const contractResult = await createContractAction(slug, {
    clientId: quote.client_id,
    clientName: quote.client_name,
    clientCompany: quote.client_company ?? undefined,
    clientEmail: quote.client_email ?? "",
    clientPhone: quote.client_phone ?? undefined,
    clientAddress: quote.client_address ?? undefined,
    title: `Contract from ${quote.quote_number}`,
    serviceDescription: (quote.items as Array<{ description: string }>)?.[0]?.description,
    items: ((quote.items as Array<{
      description: string;
      quantity: number;
      unit_price_cents: number;
    }>) ?? []).map((i) => ({
      description: i.description,
      quantity: Number(i.quantity),
      unitPriceCents: i.unit_price_cents,
    })),
    frequency: "monthly",
    startDate: new Date().toISOString().slice(0, 10),
    taxRate: Number(quote.tax_rate),
    discountCents: quote.discount_cents ?? 0,
    notes: quote.notes ?? undefined,
    isActive: true,
  });

  if (!contractResult.success) return contractResult;

  await supabase
    .from("quotes")
    .update({ status: "accepted", contract_id: contractResult.data.id })
    .eq("id", quoteId)
    .eq("company_id", ctx.company.id);

  await logQuoteEvent(supabase, {
    companyId: ctx.company.id,
    quoteId,
    eventType: "converted",
    createdBy: ctx.profile.id,
    message: contractResult.data.id,
  });

  revalidateFinance(slug);
  return contractResult;
}

type ContractEventType =
  | "created"
  | "updated"
  | "invoice_generated"
  | "payment_received"
  | "renewed"
  | "suspended"
  | "cancelled"
  | "duplicated"
  | "deleted"
  | "comment";

async function logContractEvent(
  supabase: Awaited<ReturnType<typeof createClient>>,
  params: {
    companyId: string;
    contractId: string;
    eventType: ContractEventType;
    createdBy?: string | null;
    message?: string;
  },
) {
  await supabase.from("contract_events").insert({
    company_id: params.companyId,
    contract_id: params.contractId,
    event_type: params.eventType,
    message: params.message ?? null,
    created_by: params.createdBy ?? null,
  });
}

function mapContractItems(input: CreateContractInput["items"]) {
  return input.map((item, index) => ({
    description: item.description,
    quantity: item.quantity,
    unitPriceCents: item.unitPriceCents,
    lineTotalCents: calculateLineTotal(item.quantity, item.unitPriceCents, 0),
    sortOrder: index,
  }));
}

async function insertContractItems(
  supabase: Awaited<ReturnType<typeof createClient>>,
  companyId: string,
  contractId: string,
  items: ReturnType<typeof mapContractItems>,
) {
  if (items.length === 0) return;
  await supabase.from("contract_items").insert(
    items.map((item) => ({
      company_id: companyId,
      contract_id: contractId,
      description: item.description,
      quantity: item.quantity,
      unit_price_cents: item.unitPriceCents,
      line_total_cents: item.lineTotalCents,
      sort_order: item.sortOrder,
    })),
  );
}

export async function createContractAction(
  slug: string,
  input: CreateContractInput,
): Promise<ActionResult<{ id: string }>> {
  const ctx = await requireCompanyContext({ slug, minRole: "supervisor" });
  const parsed = createContractSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  }

  const items = mapContractItems(parsed.data.items);
  const totals = calculateTotals(items, parsed.data.taxRate, parsed.data.discountCents ?? 0);
  const supabase = await createClient();
  const contractNumber = await nextDocumentNumber(supabase, ctx.company.id, "contract");

  const { data, error } = await supabase
    .from("contracts")
    .insert({
      company_id: ctx.company.id,
      client_id: parsed.data.clientId,
      address_id: parsed.data.addressId ?? null,
      contract_number: contractNumber,
      title: parsed.data.title,
      service_description: parsed.data.serviceDescription ?? null,
      amount_cents: totals.totalCents,
      subtotal_cents: totals.subtotalCents,
      tax_cents: totals.taxCents,
      total_cents: totals.totalCents,
      discount_cents: totals.discountCents,
      frequency: parsed.data.frequency,
      start_date: parsed.data.startDate,
      end_date: parsed.data.endDate ?? null,
      next_invoice_date: parsed.data.startDate,
      tax_rate: parsed.data.taxRate,
      notes: parsed.data.notes ?? null,
      is_active: parsed.data.isActive,
      status: parsed.data.status ?? "active",
      auto_renew: parsed.data.autoRenew,
      renewal_notice_days: parsed.data.renewalNoticeDays,
      auto_generate_invoice: parsed.data.autoGenerateInvoice,
      auto_send_email: parsed.data.autoSendEmail,
      auto_generate_pdf: parsed.data.autoGeneratePdf,
      payment_reminder: parsed.data.paymentReminder,
      client_company: parsed.data.clientCompany ?? null,
      client_email: parsed.data.clientEmail || null,
      client_phone: parsed.data.clientPhone ?? null,
      client_address: parsed.data.clientAddress ?? null,
      assigned_to: parsed.data.assignedTo ?? ctx.profile.id,
      created_by: ctx.profile.id,
    })
    .select("id")
    .single();

  if (error || !data) return { success: false, error: error?.message ?? "Failed" };

  await insertContractItems(supabase, ctx.company.id, data.id, items);
  await logContractEvent(supabase, {
    companyId: ctx.company.id,
    contractId: data.id,
    eventType: "created",
    createdBy: ctx.profile.id,
  });

  revalidateFinance(slug);
  if (parsed.data.addressId && parsed.data.isActive !== false) {
    await generateTasksFromContractAction(slug, data.id);
  }

  void emitAutomationEvent({
    companyId: ctx.company.id,
    slug,
    trigger: "contract.created",
    payload: {
      contractId: data.id,
      title: parsed.data.title,
      frequency: parsed.data.frequency,
      amountCents: totals.totalCents,
      hasAddress: Boolean(parsed.data.addressId),
      addressId: parsed.data.addressId ?? null,
      clientEmail: parsed.data.clientEmail ?? null,
      clientPhone: parsed.data.clientPhone ?? null,
      entityType: "contract",
      entityId: data.id,
    },
  }).catch(() => undefined);

  return { success: true, data: { id: data.id } };
}

export async function updateContractAction(
  slug: string,
  contractId: string,
  input: CreateContractInput,
): Promise<ActionResult<{ id: string }>> {
  const ctx = await requireCompanyContext({ slug, minRole: "supervisor" });
  const parsed = createContractSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  }

  const items = mapContractItems(parsed.data.items);
  const totals = calculateTotals(items, parsed.data.taxRate, parsed.data.discountCents ?? 0);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("contracts")
    .update({
      client_id: parsed.data.clientId,
      address_id: parsed.data.addressId ?? null,
      title: parsed.data.title,
      service_description: parsed.data.serviceDescription ?? null,
      amount_cents: totals.totalCents,
      subtotal_cents: totals.subtotalCents,
      tax_cents: totals.taxCents,
      total_cents: totals.totalCents,
      discount_cents: totals.discountCents,
      frequency: parsed.data.frequency,
      start_date: parsed.data.startDate,
      end_date: parsed.data.endDate ?? null,
      tax_rate: parsed.data.taxRate,
      notes: parsed.data.notes ?? null,
      is_active: parsed.data.isActive,
      status: parsed.data.status,
      auto_renew: parsed.data.autoRenew,
      renewal_notice_days: parsed.data.renewalNoticeDays,
      auto_generate_invoice: parsed.data.autoGenerateInvoice,
      auto_send_email: parsed.data.autoSendEmail,
      auto_generate_pdf: parsed.data.autoGeneratePdf,
      payment_reminder: parsed.data.paymentReminder,
      client_company: parsed.data.clientCompany ?? null,
      client_email: parsed.data.clientEmail || null,
      client_phone: parsed.data.clientPhone ?? null,
      client_address: parsed.data.clientAddress ?? null,
      assigned_to: parsed.data.assignedTo ?? undefined,
    })
    .eq("id", contractId)
    .eq("company_id", ctx.company.id)
    .select("id")
    .single();

  if (error || !data) return { success: false, error: error?.message ?? "Failed" };

  await supabase
    .from("contract_items")
    .delete()
    .eq("contract_id", contractId)
    .eq("company_id", ctx.company.id);
  await insertContractItems(supabase, ctx.company.id, contractId, items);
  await logContractEvent(supabase, {
    companyId: ctx.company.id,
    contractId,
    eventType: "updated",
    createdBy: ctx.profile.id,
  });

  revalidateFinance(slug);
  if (parsed.data.addressId && parsed.data.isActive !== false) {
    await generateTasksFromContractAction(slug, contractId);
  }
  return { success: true, data: { id: data.id } };
}

export async function updateContractStatusAction(
  slug: string,
  contractId: string,
  status: ContractStatus,
): Promise<ActionResult> {
  const ctx = await requireCompanyContext({ slug, minRole: "supervisor" });
  const parsed = contractStatusSchema.safeParse(status);
  if (!parsed.success) return { success: false, error: "Invalid status" };

  const supabase = await createClient();
  const isActive = status === "active" || status === "renewing";

  const { error } = await supabase
    .from("contracts")
    .update({ status: parsed.data, is_active: isActive })
    .eq("id", contractId)
    .eq("company_id", ctx.company.id);

  if (error) return { success: false, error: error.message };

  const eventType: ContractEventType =
    status === "suspended"
      ? "suspended"
      : status === "cancelled"
        ? "cancelled"
        : status === "renewing"
          ? "renewed"
          : "updated";

  await logContractEvent(supabase, {
    companyId: ctx.company.id,
    contractId,
    eventType,
    createdBy: ctx.profile.id,
    message: status,
  });

  revalidateFinance(slug);
  return { success: true, data: undefined };
}

export async function deleteContractAction(
  slug: string,
  contractId: string,
): Promise<ActionResult> {
  const ctx = await requireCompanyContext({ slug, minRole: "supervisor" });
  const supabase = await createClient();

  const { data: contract } = await supabase
    .from("contracts")
    .select("status")
    .eq("id", contractId)
    .eq("company_id", ctx.company.id)
    .single();

  if (!contract) return { success: false, error: "Contract not found" };
  if (contract.status && contract.status !== "pending" && contract.status !== "cancelled") {
    return { success: false, error: "Only pending or cancelled contracts can be deleted" };
  }

  const { error } = await supabase
    .from("contracts")
    .delete()
    .eq("id", contractId)
    .eq("company_id", ctx.company.id);

  if (error) return { success: false, error: error.message };
  revalidateFinance(slug);
  return { success: true, data: undefined };
}

export async function duplicateContractAction(
  slug: string,
  contractId: string,
): Promise<ActionResult<{ id: string }>> {
  const ctx = await requireCompanyContext({ slug, minRole: "supervisor" });
  const supabase = await createClient();

  const { data: contract } = await supabase
    .from("contracts")
    .select("*, items:contract_items(*), client:clients(name, contact_name, email, phone)")
    .eq("id", contractId)
    .eq("company_id", ctx.company.id)
    .single();

  if (!contract) return { success: false, error: "Contract not found" };

  const client = contract.client as
    | { name: string; contact_name?: string | null; email?: string | null; phone?: string | null }
    | Array<{ name: string; contact_name?: string | null; email?: string | null; phone?: string | null }>
    | null;
  const clientRow = Array.isArray(client) ? client[0] : client;
  const items =
    (contract.items as Array<{
      description: string;
      quantity: number;
      unit_price_cents: number;
    }>) ?? [];

  const result = await createContractAction(slug, {
    clientId: contract.client_id,
    clientName: clientRow?.name,
    clientCompany: contract.client_company ?? clientRow?.contact_name ?? undefined,
    clientEmail: contract.client_email ?? clientRow?.email ?? "",
    clientPhone: contract.client_phone ?? clientRow?.phone ?? undefined,
    clientAddress: contract.client_address ?? undefined,
    title: `${contract.title} (copy)`,
    serviceDescription: contract.service_description ?? undefined,
    items: items.map((i) => ({
      description: i.description,
      quantity: Number(i.quantity),
      unitPriceCents: i.unit_price_cents,
    })),
    frequency: contract.frequency,
    startDate: new Date().toISOString().slice(0, 10),
    endDate: contract.end_date,
    taxRate: Number(contract.tax_rate),
    discountCents: contract.discount_cents ?? 0,
    notes: contract.notes ?? undefined,
    autoRenew: contract.auto_renew ?? true,
    renewalNoticeDays: contract.renewal_notice_days ?? 30,
    autoGenerateInvoice: contract.auto_generate_invoice ?? true,
    autoSendEmail: contract.auto_send_email ?? false,
    autoGeneratePdf: contract.auto_generate_pdf ?? true,
    paymentReminder: contract.payment_reminder ?? true,
    assignedTo: contract.assigned_to,
    isActive: false,
    status: "pending",
  });

  if (result.success) {
    await logContractEvent(supabase, {
      companyId: ctx.company.id,
      contractId,
      eventType: "duplicated",
      createdBy: ctx.profile.id,
      message: result.data.id,
    });
  }

  return result;
}

export async function createInvoiceAction(
  slug: string,
  input: CreateInvoiceInput,
): Promise<ActionResult<{ id: string }>> {
  const ctx = await requireCompanyContext({ slug, minRole: "supervisor" });
  const parsed = createInvoiceSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  }

  const supabase = await createClient();
  const items = parsed.data.items.map((item) => ({
    ...item,
    lineTotalCents: calculateLineTotal(
      item.quantity,
      item.unitPriceCents,
      item.discountPercent ?? 0,
    ),
  }));
  const totals = calculateTotals(items, parsed.data.taxRate, parsed.data.discountCents ?? 0);
  const invoiceNumber = await nextDocumentNumber(supabase, ctx.company.id, "invoice");

  const { data: invoice, error } = await supabase
    .from("invoices")
    .insert({
      company_id: ctx.company.id,
      client_id: parsed.data.clientId ?? null,
      contract_id: parsed.data.contractId ?? null,
      invoice_number: invoiceNumber,
      status: "draft",
      issue_date: parsed.data.issueDate,
      due_date: parsed.data.dueDate,
      period_start: parsed.data.periodStart ?? null,
      period_end: parsed.data.periodEnd ?? null,
      client_name: parsed.data.clientName,
      client_company: parsed.data.clientCompany ?? null,
      client_email: parsed.data.clientEmail || null,
      client_phone: parsed.data.clientPhone ?? null,
      subtotal_cents: totals.subtotalCents,
      tax_rate: totals.taxRate,
      tax_cents: totals.taxCents,
      total_cents: totals.totalCents,
      notes: parsed.data.notes ?? null,
      bank_details: parsed.data.bankDetails ?? null,
    })
    .select("id")
    .single();

  if (error || !invoice) return { success: false, error: error?.message ?? "Failed" };

  const { error: itemsError } = await supabase.from("invoice_items").insert(
    items.map((item, index) => ({
      company_id: ctx.company.id,
      invoice_id: invoice.id,
      description: item.description,
      quantity: item.quantity,
      unit_price_cents: item.unitPriceCents,
      line_total_cents: item.lineTotalCents,
      sort_order: index,
    })),
  );

  if (itemsError) return { success: false, error: itemsError.message };
  revalidateFinance(slug);
  return { success: true, data: { id: invoice.id } };
}

export async function duplicateInvoiceAction(
  slug: string,
  invoiceId: string,
): Promise<ActionResult<{ id: string }>> {
  const ctx = await requireCompanyContext({ slug, minRole: "supervisor" });
  const supabase = await createClient();

  const { data: inv } = await supabase
    .from("invoices")
    .select("*, items:invoice_items(*)")
    .eq("id", invoiceId)
    .eq("company_id", ctx.company.id)
    .single();

  if (!inv) return { success: false, error: "Invoice not found" };

  const items = (inv.items as Array<{
    description: string;
    quantity: number;
    unit_price_cents: number;
  }>) ?? [];

  return createInvoiceAction(slug, {
    clientId: inv.client_id,
    contractId: inv.contract_id,
    clientName: inv.client_name,
    clientCompany: inv.client_company ?? undefined,
    clientEmail: inv.client_email ?? "",
    clientPhone: inv.client_phone ?? undefined,
    issueDate: new Date().toISOString().slice(0, 10),
    dueDate: inv.due_date,
    periodStart: inv.period_start ?? undefined,
    periodEnd: inv.period_end ?? undefined,
    taxRate: Number(inv.tax_rate),
    notes: inv.notes ?? undefined,
    bankDetails: inv.bank_details ?? undefined,
    items: items.map((i) => ({
      description: i.description,
      quantity: Number(i.quantity),
      unitPriceCents: i.unit_price_cents,
    })),
  });
}

export async function deleteInvoiceAction(
  slug: string,
  invoiceId: string,
): Promise<ActionResult> {
  const ctx = await requireCompanyContext({ slug, minRole: "supervisor" });
  const supabase = await createClient();

  const { data: inv } = await supabase
    .from("invoices")
    .select("status")
    .eq("id", invoiceId)
    .eq("company_id", ctx.company.id)
    .single();

  if (!inv) return { success: false, error: "Invoice not found" };
  if (inv.status !== "draft") {
    return { success: false, error: "Only draft invoices can be deleted" };
  }

  const { error } = await supabase
    .from("invoices")
    .delete()
    .eq("id", invoiceId)
    .eq("company_id", ctx.company.id);

  if (error) return { success: false, error: error.message };
  revalidateFinance(slug);
  return { success: true, data: undefined };
}

export async function updateInvoiceStatusAction(
  slug: string,
  invoiceId: string,
  status: "draft" | "sent" | "paid" | "partial" | "overdue" | "cancelled",
): Promise<ActionResult> {
  const ctx = await requireCompanyContext({ slug, minRole: "supervisor" });
  const supabase = await createClient();
  const { error } = await supabase
    .from("invoices")
    .update({ status })
    .eq("id", invoiceId)
    .eq("company_id", ctx.company.id);
  if (error) return { success: false, error: error.message };
  revalidateFinance(slug);
  return { success: true, data: undefined };
}

export async function createPaymentAction(
  slug: string,
  input: CreatePaymentInput,
): Promise<ActionResult<{ id: string }>> {
  const ctx = await requireCompanyContext({ slug, minRole: "supervisor" });
  const parsed = createPaymentSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  }

  const supabase = await createClient();
  const { data: invoice } = await supabase
    .from("invoices")
    .select("total_cents, amount_paid_cents")
    .eq("id", parsed.data.invoiceId)
    .eq("company_id", ctx.company.id)
    .single();

  if (!invoice) return { success: false, error: "Invoice not found" };

  const { data: payment, error } = await supabase
    .from("payments")
    .insert({
      company_id: ctx.company.id,
      invoice_id: parsed.data.invoiceId,
      amount_cents: parsed.data.amountCents,
      payment_date: parsed.data.paymentDate,
      method: parsed.data.method,
      reference: parsed.data.reference ?? null,
      notes: parsed.data.notes ?? null,
      created_by: ctx.profile.id,
    })
    .select("id")
    .single();

  if (error || !payment) return { success: false, error: error?.message ?? "Failed" };

  const newPaid = (invoice.amount_paid_cents ?? 0) + parsed.data.amountCents;
  const newStatus =
    newPaid >= invoice.total_cents
      ? "paid"
      : newPaid > 0
        ? "partial"
        : "sent";

  await supabase
    .from("invoices")
    .update({ amount_paid_cents: newPaid, status: newStatus })
    .eq("id", parsed.data.invoiceId);

  revalidateFinance(slug);
  return { success: true, data: { id: payment.id } };
}

export async function generateRecurringInvoicesAction(
  slug: string,
): Promise<ActionResult<{ count: number }>> {
  await requireCompanyContext({ slug, minRole: "supervisor" });
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("generate_recurring_invoices");
  if (error) return { success: false, error: error.message };
  revalidateFinance(slug);
  return { success: true, data: { count: (data as number) ?? 0 } };
}

export interface CashflowMonth {
  key: string;
  label: string;
  issuedCents: number;
  paidCents: number;
  pendingCents: number;
  receivedCents: number;
}

export async function getCashflowData(slug: string): Promise<CashflowMonth[]> {
  const ctx = await requireCompanyContext({ slug, minRole: "supervisor" });
  const supabase = await createClient();
  const companyId = ctx.company.id;
  const now = new Date();
  const months: CashflowMonth[] = [];

  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = monthKey(d);
    const { start, end } = getMonthRange(key);
    const label = d.toLocaleDateString("de-DE", { month: "short", year: "2-digit" });

    const [{ data: invoices }, { data: payments }] = await Promise.all([
      supabase
        .from("invoices")
        .select("total_cents, amount_paid_cents, status")
        .eq("company_id", companyId)
        .gte("issue_date", start)
        .lte("issue_date", end)
        .neq("status", "cancelled"),
      supabase
        .from("payments")
        .select("amount_cents")
        .eq("company_id", companyId)
        .gte("payment_date", start)
        .lte("payment_date", end),
    ]);

    const issuedCents = invoices?.reduce((s, i) => s + (i.total_cents ?? 0), 0) ?? 0;
    const paidCents =
      invoices?.filter((i) => i.status === "paid").reduce((s, i) => s + (i.total_cents ?? 0), 0) ?? 0;
    const pendingCents =
      invoices?.reduce(
        (s, i) => s + Math.max(0, (i.total_cents ?? 0) - (i.amount_paid_cents ?? 0)),
        0,
      ) ?? 0;
    const receivedCents = payments?.reduce((s, p) => s + (p.amount_cents ?? 0), 0) ?? 0;

    months.push({ key, label, issuedCents, paidCents, pendingCents, receivedCents });
  }

  return months;
}
