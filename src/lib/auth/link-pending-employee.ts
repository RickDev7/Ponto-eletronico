import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

type UserMetadata = Record<string, unknown> | undefined;

/**
 * Links an auth user to a pending employee record (member_id null).
 * Handles incomplete mobile registration and self-signup before admin linking.
 */
export async function linkPendingEmployeeMembership(
  userId: string,
  email: string,
  metadata?: UserMetadata,
): Promise<boolean> {
  const admin = createAdminClient();
  const normalizedEmail = email.trim().toLowerCase();

  const employeeIdFromMeta =
    typeof metadata?.employee_id === "string" ? metadata.employee_id : null;
  const companyIdFromMeta =
    typeof metadata?.company_id === "string" ? metadata.company_id : null;

  if (employeeIdFromMeta && companyIdFromMeta) {
    const linked = await linkEmployeeRecord(admin, userId, employeeIdFromMeta, companyIdFromMeta);
    if (linked) return true;
  }

  const { data: byEmail } = await admin
    .from("employees")
    .select("id, company_id")
    .ilike("email", normalizedEmail)
    .is("member_id", null)
    .neq("status", "terminated");

  const pending = byEmail ?? [];
  if (pending.length !== 1) return false;

  return linkEmployeeRecord(
    admin,
    userId,
    pending[0]!.id as string,
    pending[0]!.company_id as string,
  );
}

async function linkEmployeeRecord(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
  employeeId: string,
  companyId: string,
): Promise<boolean> {
  const { data: employee } = await admin
    .from("employees")
    .select("id, member_id, status")
    .eq("id", employeeId)
    .eq("company_id", companyId)
    .maybeSingle();

  if (!employee || employee.member_id) return false;

  const { data: existingMember } = await admin
    .from("company_members")
    .select("id, role")
    .eq("company_id", companyId)
    .eq("user_id", userId)
    .maybeSingle();

  let memberId: string;

  if (existingMember) {
    if (existingMember.role !== "employee") return false;
    memberId = existingMember.id as string;
  } else {
    const { data: member, error: memberError } = await admin
      .from("company_members")
      .insert({
        company_id: companyId,
        user_id: userId,
        role: "employee",
        status: "active",
        joined_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (memberError || !member) return false;
    memberId = member.id as string;
  }

  const nextStatus =
    employee.status === "inactive" || employee.status === "terminated"
      ? "active"
      : employee.status;

  const { error: linkError } = await admin
    .from("employees")
    .update({ member_id: memberId, status: nextStatus })
    .eq("id", employeeId)
    .eq("company_id", companyId)
    .is("member_id", null);

  return !linkError;
}

async function findAuthUserIdByEmail(
  admin: ReturnType<typeof createAdminClient>,
  email: string,
): Promise<string | null> {
  const normalizedEmail = email.trim().toLowerCase();

  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error || !data?.users?.length) return null;

    const match = data.users.find((u) => u.email?.toLowerCase() === normalizedEmail);
    if (match) return match.id;

    if (data.users.length < 200) break;
  }

  return null;
}

export async function resolveAuthUserIdForEmployee(
  admin: ReturnType<typeof createAdminClient>,
  email: string,
  password: string,
  fullName: string,
  metadata: Record<string, string>,
): Promise<{ userId: string } | { error: string }> {
  const normalizedEmail = email.trim().toLowerCase();

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: normalizedEmail,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, ...metadata },
  });

  if (created?.user) {
    return { userId: created.user.id };
  }

  const alreadyExists =
    createError?.message?.toLowerCase().includes("already") ||
    createError?.message?.toLowerCase().includes("registered") ||
    createError?.message?.toLowerCase().includes("exists");

  if (!alreadyExists) {
    return { error: createError?.message ?? "Failed to create user" };
  }

  const existingId = await findAuthUserIdByEmail(admin, normalizedEmail);
  if (!existingId) {
    return { error: createError?.message ?? "User not found" };
  }

  const { error: updateError } = await admin.auth.admin.updateUserById(existingId, {
    password,
    user_metadata: { full_name: fullName, ...metadata },
  });

  if (updateError) {
    return { error: updateError.message };
  }

  return { userId: existingId };
}
