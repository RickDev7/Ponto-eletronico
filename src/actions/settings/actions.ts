"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireCompanyContext } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionResult } from "@/actions/auth/actions";
import type { MemberRole } from "@/types";
import { actionError } from "@/lib/i18n/action-error";
import { enforcePlanLimit } from "@/lib/billing/enforcement";

async function validationError(parsed: z.SafeParseError<unknown>): Promise<string> {
  const field = parsed.error.issues[0]?.path[0];
  if (field === "email") return actionError("invalidEmail");
  if (field === "name" || field === "full_name") return actionError("nameTooShort");
  return actionError("invalidInput");
}

// ── Schemas ────────────────────────────────────────────────────────────────────

const updateCompanySchema = z.object({
  name: z.string().min(2),
  legal_name: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  tax_id: z.string().optional(),
});

const updateProfileSchema = z.object({
  full_name: z.string().min(2),
  phone: z.string().optional(),
  locale: z.enum(["pt", "en"]).optional(),
});

const inviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "supervisor", "employee"]),
});

const updateCompanyRegionalSchema = z.object({
  locale: z.enum(["pt-BR", "en-US", "de-DE"]),
  timezone: z.string().min(1),
  currency: z.enum(["BRL", "EUR", "USD"]),
});

// ── Company ────────────────────────────────────────────────────────────────────

export async function updateCompany(
  slug: string,
  raw: unknown,
): Promise<ActionResult> {
  const ctx = await requireCompanyContext({ slug, minRole: "admin" });
  const parsed = updateCompanySchema.safeParse(raw);
  if (!parsed.success)
    return { success: false, error: await validationError(parsed) };

  const supabase = await createClient();
  const { error } = await supabase
    .from("companies")
    .update({
      name: parsed.data.name,
      legal_name: parsed.data.legal_name || null,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      tax_id: parsed.data.tax_id || null,
    })
    .eq("id", ctx.company.id);

  if (error) return { success: false, error: error.message };
  revalidatePath(`/${slug}/settings`);
  return { success: true, data: undefined };
}

export async function updateCompanyRegionalSettings(
  slug: string,
  raw: unknown,
): Promise<ActionResult> {
  const ctx = await requireCompanyContext({ slug, minRole: "admin" });
  const parsed = updateCompanyRegionalSchema.safeParse(raw);
  if (!parsed.success)
    return { success: false, error: await validationError(parsed) };

  const current = (ctx.company.settings ?? {}) as Record<string, unknown>;
  const supabase = await createClient();
  const { error } = await supabase
    .from("companies")
    .update({
      settings: {
        ...current,
        locale: parsed.data.locale,
        timezone: parsed.data.timezone,
        currency: parsed.data.currency,
      },
    })
    .eq("id", ctx.company.id);

  if (error) return { success: false, error: error.message };
  revalidatePath(`/${slug}/settings`);
  return { success: true, data: undefined };
}

// ── Profile ────────────────────────────────────────────────────────────────────

export async function updateProfile(
  slug: string,
  raw: unknown,
): Promise<ActionResult> {
  const ctx = await requireCompanyContext({ slug });
  const parsed = updateProfileSchema.safeParse(raw);
  if (!parsed.success)
    return { success: false, error: await validationError(parsed) };

  const supabase = await createClient();
  const update: { full_name: string; phone: string | null; locale?: string } = {
    full_name: parsed.data.full_name,
    phone: parsed.data.phone || null,
  };
  if (parsed.data.locale) update.locale = parsed.data.locale;

  const { error } = await supabase
    .from("profiles")
    .update(update)
    .eq("id", ctx.profile.id);

  if (error) return { success: false, error: error.message };
  revalidatePath(`/${slug}/settings`);
  return { success: true, data: undefined };
}

// ── Members ────────────────────────────────────────────────────────────────────

export async function getCompanyMembers(slug: string) {
  const ctx = await requireCompanyContext({ slug, minRole: "admin" });
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("company_members")
    .select(`
      id, role, status, joined_at,
      profile:profiles(id, full_name, avatar_url)
    `)
    .eq("company_id", ctx.company.id)
    .order("joined_at", { ascending: true });

  if (error) return { success: false as const, error: error.message };
  return { success: true as const, data: data ?? [] };
}

export async function updateMemberRole(
  slug: string,
  memberId: string,
  role: MemberRole,
): Promise<ActionResult> {
  const ctx = await requireCompanyContext({ slug, minRole: "admin" });

  // Prevent admin from demoting themselves
  if (memberId === ctx.membership.id && role !== "admin") {
    return {
      success: false,
      error: await actionError("cannotChangeOwnRole"),
    };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("company_members")
    .update({ role })
    .eq("id", memberId)
    .eq("company_id", ctx.company.id);

  if (error) return { success: false, error: error.message };
  revalidatePath(`/${slug}/settings`);
  return { success: true, data: undefined };
}

export async function removeMember(
  slug: string,
  memberId: string,
): Promise<ActionResult> {
  const ctx = await requireCompanyContext({ slug, minRole: "admin" });

  if (memberId === ctx.membership.id) {
    return {
      success: false,
      error: await actionError("cannotRemoveSelf"),
    };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("company_members")
    .delete()
    .eq("id", memberId)
    .eq("company_id", ctx.company.id);

  if (error) return { success: false, error: error.message };
  revalidatePath(`/${slug}/settings`);
  return { success: true, data: undefined };
}

export async function inviteMember(
  slug: string,
  raw: unknown,
): Promise<ActionResult<{ email: string }>> {
  const ctx = await requireCompanyContext({ slug, minRole: "admin" });
  const parsed = inviteMemberSchema.safeParse(raw);
  if (!parsed.success)
    return { success: false, error: await validationError(parsed) };

  const supabase = await createClient();

  // Check if already a member
  const { data: existing } = await supabase
    .from("company_invites")
    .select("id")
    .eq("company_id", ctx.company.id)
    .eq("email", parsed.data.email)
    .maybeSingle();

  if (existing) {
    return { success: false, error: await actionError("emailAlreadyInvited") };
  }

  const limitCheck = await enforcePlanLimit(ctx.company.id, "employees", 1);
  if (!limitCheck.allowed) {
    return { success: false, error: limitCheck.error };
  }

  // Create invite record
  const { error: inviteError } = await supabase.from("company_invites").insert({
    company_id: ctx.company.id,
    email: parsed.data.email,
    role: parsed.data.role,
    invited_by: ctx.profile.id,
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  });

  if (inviteError) return { success: false, error: inviteError.message };

  // Send invite email via Supabase Auth (Admin API)
  try {
    const adminClient = createAdminClient();
    await adminClient.auth.admin.inviteUserByEmail(parsed.data.email, {
      data: {
        company_id: ctx.company.id,
        company_name: ctx.company.name,
        role: parsed.data.role,
      },
    });
  } catch {
    // Email invite is best-effort — record already saved
  }

  revalidatePath(`/${slug}/settings`);
  return { success: true, data: { email: parsed.data.email } };
}
