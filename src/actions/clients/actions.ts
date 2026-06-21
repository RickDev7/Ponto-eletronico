"use server";

import { revalidatePath } from "next/cache";
import { requireCompanyContext } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import {
  createClientSchema,
  createAddressSchema,
  type CreateClientInput,
  type CreateAddressInput,
} from "@/lib/validations/clients";
import type { ActionResult } from "@/actions/auth/actions";
import type { ServiceType } from "@/types";

export async function createClientAction(
  slug: string,
  input: CreateClientInput,
): Promise<ActionResult<{ id: string }>> {
  const ctx = await requireCompanyContext({ slug, minRole: "supervisor" });
  const parsed = createClientSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .insert({
      company_id: ctx.company.id,
      name: parsed.data.name,
      contact_name: parsed.data.contactName || null,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      notes: parsed.data.notes || null,
      source_lead_id: parsed.data.sourceLeadId ?? null,
    })
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };
  revalidatePath(`/${slug}/clients`);
  revalidatePath(`/${slug}/clients/${data.id}`);
  return { success: true, data: { id: data.id } };
}

export async function updateClientAction(
  slug: string,
  id: string,
  input: CreateClientInput,
): Promise<ActionResult> {
  const ctx = await requireCompanyContext({ slug, minRole: "supervisor" });
  const parsed = createClientSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("clients")
    .update({
      name: parsed.data.name,
      contact_name: parsed.data.contactName || null,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      notes: parsed.data.notes || null,
    })
    .eq("id", id)
    .eq("company_id", ctx.company.id);

  if (error) return { success: false, error: error.message };
  revalidatePath(`/${slug}/clients`);
  return { success: true, data: undefined };
}

export async function createAddressAction(
  slug: string,
  input: CreateAddressInput,
): Promise<ActionResult<{ id: string }>> {
  const ctx = await requireCompanyContext({ slug, minRole: "supervisor" });
  const parsed = createAddressSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("addresses")
    .insert({
      company_id: ctx.company.id,
      client_id: parsed.data.clientId,
      label: parsed.data.label || null,
      street: parsed.data.street,
      house_number: parsed.data.houseNumber || null,
      postal_code: parsed.data.postalCode,
      city: parsed.data.city,
      access_notes: parsed.data.accessNotes || null,
      service_types: parsed.data.serviceTypes as ServiceType[],
    })
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };
  revalidatePath(`/${slug}/addresses`);
  revalidatePath(`/${slug}/operations/properties`);
  revalidatePath(`/${slug}/clients`);
  revalidatePath(`/${slug}/clients/${parsed.data.clientId}`);
  if (data?.id) {
    revalidatePath(`/${slug}/operations/properties/${data.id}`);
  }
  return { success: true, data: { id: data.id } };
}
