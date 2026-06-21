"use server";

import { revalidatePath } from "next/cache";
import { ROUTES } from "@/config/constants";
import { createClient } from "@/lib/supabase/server";
import { getUserCompanies, getUserProfile } from "@/lib/auth/session";
import { resolvePostAuthRedirect } from "@/lib/auth/post-auth-redirect";
import { linkPendingEmployeeMembership } from "@/lib/auth/link-pending-employee";
import { actionError } from "@/lib/i18n/action-error";
import { seedCompanySubscription } from "@/lib/billing/enforcement";
import type { AppLocale } from "@/i18n/routing";
import {
  createCompanySchema,
  loginSchema,
  registerSchema,
  ACCEPT_TERMS_ERROR_KEY,
  type CreateCompanyInput,
  type SignInInput,
  type RegisterInput,
} from "@/lib/validations/auth";

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

export async function signIn(
  input: SignInInput,
): Promise<ActionResult<{ redirectTo: string; preferredLocale: AppLocale }>> {
  const { redirect: explicitRedirect, ...credentials } = input;
  const parsed = loginSchema.safeParse(credentials);
  if (!parsed.success) {
    return { success: false, error: await actionError("invalidInput") };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: await actionError("authFailed") };
  }

  if (user.email) {
    try {
      await linkPendingEmployeeMembership(user.id, user.email, user.user_metadata);
    } catch (err) {
      console.error("[signIn] linkPendingEmployeeMembership failed:", err);
    }
  }

  const profile = await getUserProfile(user.id);
  const preferredLocale: AppLocale = profile?.locale === "en" ? "en" : "pt";

  const companies = await getUserCompanies(user.id);
  const redirectTo = await resolvePostAuthRedirect(user.id, companies, {
    explicitRedirect,
  });

  revalidatePath("/", "layout");
  return { success: true, data: { redirectTo, preferredLocale } };
}

export async function signUp(
  input: RegisterInput,
): Promise<ActionResult<{ redirectTo: string }>> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message;
    if (message === ACCEPT_TERMS_ERROR_KEY) {
      return { success: false, error: await actionError("acceptTermsRequired") };
    }
    return { success: false, error: message ?? (await actionError("invalidInput")) };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
    },
  });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/", "layout");
  return { success: true, data: { redirectTo: ROUTES.onboarding } };
}

export async function signOut(): Promise<ActionResult> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  return { success: true, data: undefined };
}

export async function requestPasswordReset(
  email: string,
): Promise<ActionResult> {
  if (!email || !email.includes("@")) {
    return { success: false, error: await actionError("invalidEmailAddress") };
  }

  const supabase = await createClient();
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.NEXTAUTH_URL ??
    "http://localhost:3000";

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/auth/callback?next=/update-password&type=recovery`,
  });

  // Always return success to prevent email enumeration
  if (error && error.message !== "For security purposes") {
    console.error("Password reset error:", error.message);
  }

  return { success: true, data: undefined };
}

export async function updatePassword(
  newPassword: string,
): Promise<ActionResult> {
  if (!newPassword || newPassword.length < 8) {
    return {
      success: false,
      error: await actionError("passwordTooShort"),
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: newPassword });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: undefined };
}

export async function createCompany(
  input: CreateCompanyInput,
): Promise<ActionResult<{ companyId: string; slug: string }>> {
  const parsed = createCompanySchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: await actionError("notAuthenticated") };
  }

  const rpcClient = supabase as unknown as {
    rpc(
      fn: "create_company_with_admin",
      args: { p_name: string; p_slug: string; p_legal_name?: string | null },
    ): Promise<{ data: string | null; error: { message: string } | null }>;
  };

  const { data, error } = await rpcClient.rpc("create_company_with_admin", {
    p_name: parsed.data.name,
    p_slug: parsed.data.slug,
    p_legal_name: parsed.data.legalName ?? null,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  const companyId = data as string;
  try {
    await seedCompanySubscription(companyId);
  } catch (seedError) {
    console.error("Failed to seed subscription:", seedError);
  }

  revalidatePath("/", "layout");
  return {
    success: true,
    data: { companyId, slug: parsed.data.slug },
  };
}
