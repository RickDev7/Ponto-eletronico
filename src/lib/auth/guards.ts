import { redirect } from "next/navigation";
import { ROUTES } from "@/config/constants";
import { can, type Permission } from "@/config/permissions";
import { hasMinRole, isClientRole } from "@/types/enums";
import type { MemberRole } from "@/types";
import type { Client, ClientPortalContext, CompanyContext } from "@/types/database";
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
    redirect(options.redirectTo ?? ROUTES.login);
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
    redirect(ROUTES.onboarding);
  }

  if (isClientRole(ctx.membership.role)) {
    redirect(ROUTES.clientPortal(ctx.company.slug));
  }

  if (
    options.minRole &&
    !hasMinRole(ctx.membership.role, options.minRole)
  ) {
    redirect(ROUTES.dashboard(ctx.company.slug));
  }

  if (options.permission && !can(ctx.membership.role, options.permission)) {
    redirect(ROUTES.dashboard(ctx.company.slug));
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

export async function requireClientPortalContext(
  slug: string,
): Promise<ClientPortalContext> {
  const user = await requireAuth();
  const ctx = await getCompanyContext(slug);

  if (!ctx) {
    redirect(ROUTES.onboarding);
  }

  if (!isClientRole(ctx.membership.role)) {
    redirect(ROUTES.dashboard(ctx.company.slug));
  }

  const clientId = ctx.membership.client_id;
  if (!clientId) {
    redirect(ROUTES.selectCompany);
  }

  const supabase = await createClient();
  const { data: client, error } = await supabase
    .from("clients")
    .select("*")
    .eq("id", clientId)
    .eq("company_id", ctx.company.id)
    .maybeSingle();

  if (error || !client) {
    redirect(ROUTES.selectCompany);
  }

  return { ...ctx, client: client as Client };
}
