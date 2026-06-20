"use server";

import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { ROUTES } from "@/config/constants";
import { createClient } from "@/lib/supabase/server";
import { resolveMembershipCompany } from "@/lib/auth/resolve-company";
import { getUserCompanies, getUserProfile } from "@/lib/auth/session";
import { actionError } from "@/lib/i18n/action-error";
import { seedCompanySubscription } from "@/lib/billing/enforcement";
import type { AppLocale } from "@/i18n/routing";
import {
  createCompanySchema,
  loginSchema,
  registerSchema,
  ACCEPT_TERMS_ERROR_KEY,
  type CreateCompanyInput,
  type LoginInput,
  type RegisterInput,
} from "@/lib/validations/auth";

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

export async function signIn(
  input: LoginInput,
): Promise<ActionResult<{ redirectTo: string; preferredLocale: AppLocale }>> {
  const parsed = loginSchema.safeParse(input);
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

  const profile = await getUserProfile(user.id);
  const preferredLocale: AppLocale = profile?.locale === "en" ? "en" : "pt";

  const companies = await getUserCompanies(user.id);
  let redirectTo = ROUTES.onboarding;
  if (companies.length === 1) {
    const company = resolveMembershipCompany(companies[0]!.company);
    if (company?.slug) redirectTo = ROUTES.dashboard(company.slug);
  } else if (companies.length > 1) {
    redirectTo = ROUTES.selectCompany;
  }

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

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  const locale = await getLocale();
  redirect({ href: ROUTES.login, locale });
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

  const { data, error } = await supabase.rpc("create_company_with_admin", {
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
