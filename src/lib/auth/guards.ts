import { redirectTo } from "@/i18n/server-redirect";
import { ROUTES } from "@/config/constants";
import { can, type Permission } from "@/config/permissions";
import { hasMinRole, isClientRole } from "@/types/enums";
import type { MemberRole } from "@/types";
import type { Client, ClientPortalContext, CompanyContext, Employee } from "@/types/database";
import {
  getCompanyBySlug,
  getEmployeeForMember,
  getMembership,
  getSession,
  getUserProfile,
} from "./session";
import { createClient } from "@/lib/supabase/server";

interface RequireAuthOptions {
  redirectTo?: string;
}

interface RequireCompanyOptions {
  slug: string;
  minRole?: MemberRole;
  permission?: Permission;
}

export async function requireAuth(
  options: RequireAuthOptions = {},
): Promise<NonNullable<Awaited<ReturnType<typeof getSession>>>> {
  const user = await getSession();
  if (!user) {
    await redirectTo(options.redirectTo ?? ROUTES.login);
  }
  return user;
}

export async function getCompanyContext(
  slug: string,
): Promise<CompanyContext | null> {
  const user = await getSession();
  if (!user) return null;

  const company = await getCompanyBySlug(slug);
  if (!company) return null;

  const membership = await getMembership(user.id, company.id);
  if (!membership) return null;

  const profile = await getUserProfile(user.id);
  if (!profile) return null;

  const employee = membership
    ? await getEmployeeForMember(company.id, membership.id)
    : null;

  return { company, membership, profile, employee };
}

export async function requireCompanyContext(
  options: RequireCompanyOptions,
): Promise<CompanyContext> {
  const user = await requireAuth();
  const ctx = await getCompanyContext(options.slug);

  if (!ctx) {
    await redirectTo(ROUTES.onboarding);
  }

  if (isClientRole(ctx.membership.role)) {
    await redirectTo(ROUTES.clientPortal(ctx.company.slug));
  }

  if (
    options.minRole &&
    !hasMinRole(ctx.membership.role, options.minRole)
  ) {
    await redirectTo(ROUTES.dashboard(ctx.company.slug));
  }

  if (options.permission && !can(ctx.membership.role, options.permission)) {
    await redirectTo(ROUTES.dashboard(ctx.company.slug));
  }

  return ctx;
}

export async function requireMinRole(
  ctx: CompanyContext,
  minRole: MemberRole,
): Promise<void> {
  if (!hasMinRole(ctx.membership.role, minRole)) {
    throw new Error("Insufficient permissions");
  }
}

export interface EmployeeContext extends CompanyContext {
  employee: Employee;
}

export async function requireEmployeeMobileAccess(
  slug: string,
): Promise<CompanyContext> {
  const ctx = await requireCompanyContext({ slug });

  if (ctx.membership.role === "client") {
    await redirectTo(ROUTES.clientPortal(ctx.company.slug));
  }

  if (ctx.membership.role !== "employee") {
    await redirectTo(ROUTES.mobileAccess(slug));
  }

  return ctx;
}

export async function requireEmployeeContext(
  slug: string,
): Promise<EmployeeContext> {
  const ctx = await requireEmployeeMobileAccess(slug);

  if (!ctx.employee) {
    await redirectTo(`${ROUTES.mobileAccess(slug)}?reason=profile_missing`);
  }

  return { ...ctx, employee: ctx.employee };
}

export async function requireClientPortalContext(
  slug: string,
): Promise<ClientPortalContext> {
  const user = await requireAuth();
  const ctx = await getCompanyContext(slug);

  if (!ctx) {
    await redirectTo(ROUTES.onboarding);
  }

  if (!isClientRole(ctx.membership.role)) {
    await redirectTo(ROUTES.dashboard(ctx.company.slug));
  }

  const clientId = ctx.membership.client_id;
  if (!clientId) {
    await redirectTo(ROUTES.selectCompany);
  }

  const supabase = await createClient();
  const { data: client, error } = await supabase
    .from("clients")
    .select("*")
    .eq("id", clientId)
    .eq("company_id", ctx.company.id)
    .maybeSingle();

  if (error || !client) {
    await redirectTo(ROUTES.selectCompany);
  }

  return { ...ctx, client: client as Client };
}
