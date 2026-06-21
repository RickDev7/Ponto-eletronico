import "server-only";

import { redirectTo } from "@/i18n/server-redirect";
import { ROUTES } from "@/config/constants";
import { resolvePostAuthRedirect } from "@/lib/auth/post-auth-redirect";
import { createClient } from "@/lib/supabase/server";
import { getSession, getUserCompanies, getUserProfile } from "@/lib/auth/session";
import type { PlatformContext } from "@/types/platform";

export async function isPlatformAdmin(userId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("platform_admins")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[isPlatformAdmin] query failed:", error.message);
    return false;
  }

  return Boolean(data);
}

async function loadPlatformContext(userId: string, email?: string | null) {
  const profile = await getUserProfile(userId);
  if (!profile) return null;

  return {
    userId,
    profile: {
      id: profile.id,
      full_name: profile.full_name,
      email: email ?? null,
    },
  } satisfies PlatformContext;
}

/** For Server Components / layouts — may redirect. */
export async function requirePlatformAdmin(): Promise<PlatformContext> {
  const user = await getSession();
  if (!user) {
    redirectTo(ROUTES.login);
  }

  const isAdmin = await isPlatformAdmin(user.id);
  if (!isAdmin) {
    const memberships = await getUserCompanies(user.id);
    const fallback = await resolvePostAuthRedirect(user.id, memberships);
    redirectTo(fallback);
  }

  const ctx = await loadPlatformContext(user.id, user.email);
  if (!ctx) {
    redirectTo(ROUTES.login);
  }

  return ctx;
}

/** For server actions — never redirects (avoids broken action responses). */
export async function guardPlatformAdminAction(): Promise<
  | { ok: true; ctx: PlatformContext }
  | { ok: false; error: string }
> {
  const user = await getSession();
  if (!user) {
    return { ok: false, error: "Not authenticated" };
  }

  if (!(await isPlatformAdmin(user.id))) {
    return { ok: false, error: "Platform access denied" };
  }

  const ctx = await loadPlatformContext(user.id, user.email);
  if (!ctx) {
    return { ok: false, error: "Profile not found" };
  }

  return { ok: true, ctx };
}
