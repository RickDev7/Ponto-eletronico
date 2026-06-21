"use server";

import { redirectTo } from "@/i18n/server-redirect";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSession } from "@/lib/auth/session";
import { actionError } from "@/lib/i18n/action-error";
import type { ActionResult } from "@/actions/auth/actions";

export interface InviteDetails {
  id: string;
  role: string;
  company: { id: string; name: string; slug: string };
  invitedBy: string | null;
  expiresAt: string;
}

/** Fetch invite details by ID — no auth required */
export async function getInviteDetails(
  inviteId: string,
): Promise<InviteDetails | null> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("company_invites")
    .select(`
      id, role, expires_at,
      company:companies(id, name, slug),
      inviter:profiles!company_invites_invited_by_fkey(full_name)
    `)
    .eq("id", inviteId)
    .is("accepted_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (!data) return null;

  const company = Array.isArray(data.company) ? data.company[0] : data.company;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const inviter = Array.isArray(data.inviter) ? (data.inviter[0] as any) : (data.inviter as any);

  return {
    id: data.id,
    role: data.role as string,
    company: company as InviteDetails["company"],
    invitedBy: inviter?.full_name ?? null,
    expiresAt: data.expires_at as string,
  };
}

/** Accept a pending invite — user must be authenticated */
export async function acceptInvite(
  inviteId: string,
  acceptTerms: boolean,
): Promise<ActionResult<{ redirectTo: string }>> {
  if (!acceptTerms) {
    return { success: false, error: await actionError("acceptTermsRequired") };
  }

  const user = await getSession();
  if (!user) redirectTo("/login");

  const supabase = await createClient();

  const { data: invite } = await supabase
    .from("company_invites")
    .select("id, company_id, role, email, expires_at, accepted_at")
    .eq("id", inviteId)
    .maybeSingle();

  if (!invite || invite.accepted_at) {
    redirectTo("/onboarding?error=invite_invalid");
  }
  if (new Date(invite.expires_at as string) < new Date()) {
    redirectTo("/onboarding?error=invite_expired");
  }

  const { data: existing } = await supabase
    .from("company_members")
    .select("id")
    .eq("user_id", user.id)
    .eq("company_id", invite.company_id)
    .maybeSingle();

  let memberId: string;

  if (!existing) {
    const { data: member, error: memberError } = await supabase
      .from("company_members")
      .insert({
        user_id: user.id,
        company_id: invite.company_id,
        role: invite.role as string,
        status: "active",
        joined_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (memberError || !member) redirectTo("/onboarding?error=accept_failed");
    memberId = member.id as string;
  } else {
    memberId = existing.id as string;
  }

  const employeeIdFromMeta = user.user_metadata?.employee_id as string | undefined;
  const admin = createAdminClient();

  if (employeeIdFromMeta) {
    await admin
      .from("employees")
      .update({ member_id: memberId, email: invite.email as string, status: "active" })
      .eq("id", employeeIdFromMeta)
      .eq("company_id", invite.company_id)
      .is("member_id", null);
  } else {
    await admin
      .from("employees")
      .update({ member_id: memberId, status: "active" })
      .eq("company_id", invite.company_id)
      .eq("email", invite.email as string)
      .is("member_id", null);
  }

  await supabase
    .from("company_invites")
    .update({ accepted_at: new Date().toISOString() })
    .eq("id", inviteId);

  const { data: company } = await supabase
    .from("companies")
    .select("slug")
    .eq("id", invite.company_id)
    .single();

  return {
    success: true,
    data: { redirectTo: `/${company?.slug ?? ""}` },
  };
}
