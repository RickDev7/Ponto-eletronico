import { redirect } from "next/navigation";
import { ROUTES } from "@/config/constants";
import { hasMinRole } from "@/types/enums";
import type { MemberRole } from "@/types";
import type { CompanyContext } from "@/types/database";
import {
  getCompanyBySlug,
  getEmployeeForMember,
  getMembership,
  getSession,
  getUserProfile,
} from "./session";

interface RequireAuthOptions {
  redirectTo?: string;
}

interface RequireCompanyOptions {
  slug: string;
  minRole?: MemberRole;
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

  if (
    options.minRole &&
    !hasMinRole(ctx.membership.role, options.minRole)
  ) {
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
