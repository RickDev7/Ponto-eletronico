"use server";

import { revalidatePath } from "next/cache";
import { randomBytes } from "node:crypto";
import { requireCompanyContext } from "@/lib/auth/guards";
import { enforcePlanLimit } from "@/lib/billing/enforcement";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { formatEmployeeNotes } from "@/lib/workforce/employees-hub";
import {
  createEmployeeFullSchema,
  createEmployeeSchema,
  importEmployeesSchema,
  inviteEmployeeSchema,
  registerEmployeeMobileSchema,
  type CreateEmployeeFullInput,
  type CreateEmployeeInput,
  type ImportEmployeesInput,
  type InviteEmployeeInput,
  type RegisterEmployeeMobileInput,
} from "@/lib/validations/employees";
import type { ActionResult } from "@/actions/auth/actions";
import type { MemberRole } from "@/types";
import { ROUTES } from "@/config/constants";
import { actionError } from "@/lib/i18n/action-error";
import { resolveAuthUserIdForEmployee } from "@/lib/auth/link-pending-employee";

function revalidateEmployeePaths(slug: string, employeeId?: string) {
  revalidatePath(`/${slug}/workforce/employees`);
  revalidatePath(`/${slug}/employees`);
  if (employeeId) {
    revalidatePath(`/${slug}/workforce/employees/${employeeId}`);
    revalidatePath(`/${slug}/employees/${employeeId}`);
  }
}

function mapAccessRole(role: CreateEmployeeFullInput["accessRole"]): MemberRole {
  if (role === "manager") return "manager";
  if (role === "supervisor") return "supervisor";
  return "employee";
}

async function assignTeamMember(
  companyId: string,
  employeeId: string,
  teamId: string | null | undefined,
) {
  if (!teamId) return;
  const supabase = await createClient();
  await supabase.from("team_members").delete().eq("employee_id", employeeId).eq("company_id", companyId);
  await supabase.from("team_members").insert({
    company_id: companyId,
    team_id: teamId,
    employee_id: employeeId,
  });
}

async function assignSkills(
  companyId: string,
  employeeId: string,
  skillIds: string[],
) {
  if (!skillIds.length) return;
  const supabase = await createClient();
  await supabase.from("employee_skills").insert(
    skillIds.map((skillId) => ({
      company_id: companyId,
      employee_id: employeeId,
      skill_id: skillId,
      level: 3,
    })),
  );
}

export async function createEmployee(
  slug: string,
  input: CreateEmployeeInput,
): Promise<ActionResult<{ id: string }>> {
  return createEmployeeFull(slug, {
    ...input,
    sendInvite: false,
    contractType: "full_time",
    weeklyHours: 40,
    status: "active",
    accessRole: "employee",
    skillIds: [],
  });
}

export async function createEmployeeFull(
  slug: string,
  input: CreateEmployeeFullInput,
): Promise<ActionResult<{ id: string }>> {
  const ctx = await requireCompanyContext({ slug, minRole: "supervisor" });
  const parsed = createEmployeeFullSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  }

  const limitCheck = await enforcePlanLimit(ctx.company.id, "employees", 1);
  if (!limitCheck.allowed) {
    return { success: false, error: limitCheck.error };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("employees")
    .insert({
      company_id: ctx.company.id,
      full_name: parsed.data.fullName,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      employee_number: parsed.data.employeeNumber || null,
      hire_date: parsed.data.hireDate || null,
      notes: formatEmployeeNotes(parsed.data.department, parsed.data.notes),
      job_title: parsed.data.jobTitle || null,
      supervisor_id: parsed.data.supervisorId ?? null,
      contract_type: parsed.data.contractType,
      weekly_hours: parsed.data.weeklyHours,
      status: parsed.data.status,
    })
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };

  await assignTeamMember(ctx.company.id, data.id, parsed.data.teamId);
  await assignSkills(ctx.company.id, data.id, parsed.data.skillIds);

  if (parsed.data.sendInvite && parsed.data.email) {
    await inviteEmployee(slug, {
      email: parsed.data.email,
      fullName: parsed.data.fullName,
      jobTitle: parsed.data.jobTitle,
      accessRole: parsed.data.accessRole,
      teamId: parsed.data.teamId,
      employeeId: data.id,
    });
  }

  revalidateEmployeePaths(slug, data.id);
  return { success: true, data: { id: data.id } };
}

export async function inviteEmployee(
  slug: string,
  input: InviteEmployeeInput & { employeeId?: string },
): Promise<ActionResult<{ email: string }>> {
  const ctx = await requireCompanyContext({ slug, minRole: "supervisor" });
  const parsed = inviteEmployeeSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  }

  const supabase = await createClient();
  let employeeId = input.employeeId;

  if (!employeeId) {
    const limitCheck = await enforcePlanLimit(ctx.company.id, "employees", 1);
    if (!limitCheck.allowed) {
      return { success: false, error: limitCheck.error };
    }

    const { data: created, error: createError } = await supabase
      .from("employees")
      .insert({
        company_id: ctx.company.id,
        full_name: parsed.data.fullName,
        email: parsed.data.email,
        job_title: parsed.data.jobTitle || null,
        status: "inactive",
      })
      .select("id")
      .single();

    if (createError) return { success: false, error: createError.message };
    const newEmployeeId = created.id as string;
    employeeId = newEmployeeId;
    await assignTeamMember(ctx.company.id, newEmployeeId, parsed.data.teamId);
  }

  const memberRole = mapAccessRole(parsed.data.accessRole);

  const { data: existingInvite } = await supabase
    .from("company_invites")
    .select("id")
    .eq("company_id", ctx.company.id)
    .eq("email", parsed.data.email)
    .maybeSingle();

  if (!existingInvite) {
    const tokenHash = randomBytes(32).toString("hex");
    const { error: inviteError } = await supabase.from("company_invites").insert({
      company_id: ctx.company.id,
      email: parsed.data.email,
      role: memberRole,
      token_hash: tokenHash,
      invited_by: ctx.profile.id,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });

    if (inviteError) return { success: false, error: inviteError.message };
  }

  try {
    const adminClient = createAdminClient();
    await adminClient.auth.admin.inviteUserByEmail(parsed.data.email, {
      data: {
        company_id: ctx.company.id,
        company_name: ctx.company.name,
        role: memberRole,
        employee_id: employeeId,
      },
    });
  } catch {
    // Best-effort email — record already saved
  }

  revalidateEmployeePaths(slug, employeeId);
  revalidatePath(`/${slug}/settings`);
  return { success: true, data: { email: parsed.data.email } };
}

/** Create login credentials and link an existing employee record for mobile/PWA access. */
export async function registerEmployeeForMobile(
  slug: string,
  input: RegisterEmployeeMobileInput,
): Promise<ActionResult<{ email: string; mobilePath: string }>> {
  const ctx = await requireCompanyContext({ slug, minRole: "supervisor" });
  const parsed = registerEmployeeMobileSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  }

  const supabase = await createClient();
  const admin = createAdminClient();
  const email = parsed.data.email.trim().toLowerCase();
  const memberRole = mapAccessRole(parsed.data.accessRole);

  const { data: employee, error: employeeError } = await supabase
    .from("employees")
    .select("id, full_name, email, member_id, status")
    .eq("id", parsed.data.employeeId)
    .eq("company_id", ctx.company.id)
    .single();

  if (employeeError || !employee) {
    return { success: false, error: await actionError("invalidInput") };
  }

  if (employee.member_id) {
    return { success: false, error: await actionError("employeeAlreadyHasAccess") };
  }

  const authResult = await resolveAuthUserIdForEmployee(admin, email, parsed.data.password, employee.full_name, {
    company_id: ctx.company.id,
    company_name: ctx.company.name,
    employee_id: employee.id,
    role: memberRole,
  });

  if ("error" in authResult) {
    return { success: false, error: authResult.error };
  }

  const userId = authResult.userId;

  const { data: existingMember } = await admin
    .from("company_members")
    .select("id")
    .eq("company_id", ctx.company.id)
    .eq("user_id", userId)
    .maybeSingle();

  let memberId: string;

  if (existingMember) {
    const { data: linkedEmployee } = await admin
      .from("employees")
      .select("id")
      .eq("member_id", existingMember.id)
      .neq("id", employee.id)
      .maybeSingle();

    if (linkedEmployee) {
      return { success: false, error: await actionError("emailLinkedToOtherEmployee") };
    }

    const { error: updateMemberError } = await admin
      .from("company_members")
      .update({ role: memberRole, status: "active" })
      .eq("id", existingMember.id);

    if (updateMemberError) {
      return { success: false, error: updateMemberError.message };
    }

    memberId = existingMember.id as string;
  } else {
    const limitCheck = await enforcePlanLimit(ctx.company.id, "employees", 1);
    if (!limitCheck.allowed) {
      return { success: false, error: limitCheck.error };
    }

    const { data: member, error: memberError } = await admin
      .from("company_members")
      .insert({
        company_id: ctx.company.id,
        user_id: userId,
        role: memberRole,
        status: "active",
        joined_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (memberError || !member) {
      return { success: false, error: memberError?.message ?? "Failed to create membership" };
    }

    memberId = member.id as string;
  }

  const nextStatus =
    employee.status === "inactive" || employee.status === "terminated"
      ? "active"
      : employee.status;

  const { error: linkError } = await supabase
    .from("employees")
    .update({
      member_id: memberId,
      email,
      status: nextStatus,
    })
    .eq("id", employee.id)
    .eq("company_id", ctx.company.id);

  if (linkError) {
    return { success: false, error: linkError.message };
  }

  await admin
    .from("profiles")
    .update({ full_name: employee.full_name })
    .eq("id", userId)
    .is("full_name", null);

  revalidateEmployeePaths(slug, employee.id);
  revalidatePath(`/${slug}/settings`);

  return {
    success: true,
    data: {
      email,
      mobilePath: ROUTES.mobile(slug),
    },
  };
}

export async function importEmployees(
  slug: string,
  input: ImportEmployeesInput,
  teamNameToId: Record<string, string>,
): Promise<ActionResult<{ created: number; failed: number }>> {
  const ctx = await requireCompanyContext({ slug, minRole: "supervisor" });
  const parsed = importEmployeesSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  }

  let created = 0;
  let failed = 0;

  for (const row of parsed.data.rows) {
    const teamId = row.teamName ? teamNameToId[row.teamName.trim().toLowerCase()] ?? null : null;
    const result = await createEmployeeFull(slug, {
      fullName: row.fullName,
      email: row.email ?? "",
      phone: row.phone ?? "",
      jobTitle: row.jobTitle ?? "",
      teamId,
      weeklyHours: row.weeklyHours ?? 40,
      contractType: "full_time",
      status: "active",
      accessRole: "employee",
      skillIds: [],
      sendInvite: Boolean(row.email),
    });

    if (result.success) created += 1;
    else failed += 1;
  }

  revalidateEmployeePaths(slug);
  return { success: true, data: { created, failed } };
}

export async function updateEmployee(
  slug: string,
  id: string,
  input: CreateEmployeeInput,
): Promise<ActionResult> {
  const ctx = await requireCompanyContext({ slug, minRole: "supervisor" });
  const parsed = createEmployeeSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("employees")
    .update({
      full_name: parsed.data.fullName,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      employee_number: parsed.data.employeeNumber || null,
      hire_date: parsed.data.hireDate || null,
      notes: parsed.data.notes || null,
    })
    .eq("id", id)
    .eq("company_id", ctx.company.id);

  if (error) return { success: false, error: error.message };

  revalidateEmployeePaths(slug, id);
  return { success: true, data: undefined };
}

export async function deleteEmployee(
  slug: string,
  id: string,
): Promise<ActionResult> {
  const ctx = await requireCompanyContext({ slug, minRole: "admin" });

  const supabase = await createClient();
  const { error } = await supabase
    .from("employees")
    .update({ status: "terminated" })
    .eq("id", id)
    .eq("company_id", ctx.company.id);

  if (error) return { success: false, error: error.message };

  revalidateEmployeePaths(slug, id);
  return { success: true, data: undefined };
}
