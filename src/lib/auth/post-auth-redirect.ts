import "server-only";

import { ROUTES, isTenantWorkspacePath } from "@/config/constants";
import { resolveMembershipCompany } from "@/lib/auth/resolve-company";
import { isPlatformAdmin } from "@/lib/auth/platform-guards";
import { isInvalidAppHref, sanitizeAppHref } from "@/lib/navigation/sanitize-href";
import type { MemberRole } from "@/types/enums";
import { isClientRole } from "@/types/enums";

export type MembershipForRedirect = {
  role: MemberRole;
  company: unknown;
};

/**
 * Resolves the post-authentication destination based on platform role and tenant membership.
 *
 * SUPER_ADMIN (platform_admins) → /super-admin
 * CLIENT → /{slug}/portal
 * EMPLOYEE → /{slug}/mobile
 * OWNER | MANAGER | SUPERVISOR → /{slug} (dashboard)
 */
export async function resolvePostAuthRedirect(
  userId: string,
  memberships: MembershipForRedirect[],
  options?: { explicitRedirect?: string | null },
): Promise<string> {
  const explicitRedirect = options?.explicitRedirect;
  if (explicitRedirect && !isInvalidAppHref(explicitRedirect)) {
    const safeRedirect = sanitizeAppHref(explicitRedirect);
    const bare = safeRedirect.split("?")[0] ?? safeRedirect;
    if (
      bare.startsWith("/super-admin") ||
      bare === "/platform" ||
      bare.startsWith("/platform/") ||
      bare === "/admin" ||
      bare.startsWith("/admin/")
    ) {
      const isAdmin = await isPlatformAdmin(userId);
      if (isAdmin) {
        return bare
          .replace(/^\/platform/, "/super-admin")
          .replace(/^\/admin/, "/super-admin");
      }
    } else if (isTenantWorkspacePath(bare)) {
      const slug = bare.split("/").filter(Boolean)[0];
      const isMobileRoute =
        bare === ROUTES.mobile(slug!) ||
        bare.startsWith(`${ROUTES.mobile(slug!)}/`);
      if (isMobileRoute && slug) {
        const membership = memberships.find((m) => {
          const company = resolveMembershipCompany(m.company);
          return company?.slug === slug;
        });
        if (membership && membership.role !== "employee") {
          return ROUTES.mobileAccess(slug);
        }
      }
      return safeRedirect;
    } else if (
      bare === ROUTES.selectCompany ||
      bare === ROUTES.onboarding ||
      bare.startsWith("/invite/")
    ) {
      return safeRedirect;
    }
  }

  if (await isPlatformAdmin(userId)) {
    return ROUTES.superAdmin;
  }

  if (memberships.length === 0) {
    return ROUTES.onboarding;
  }

  if (memberships.length > 1) {
    return ROUTES.selectCompany;
  }

  const membership = memberships[0]!;
  const company = resolveMembershipCompany(membership.company);
  const slug = company?.slug;
  if (!slug) {
    return ROUTES.onboarding;
  }

  if (isClientRole(membership.role)) {
    return ROUTES.clientPortal(slug);
  }

  if (membership.role === "employee") {
    return ROUTES.mobile(slug);
  }

  return ROUTES.dashboard(slug);
}
