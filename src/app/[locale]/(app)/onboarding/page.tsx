import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { AuthFormHeader } from "@/components/auth/auth-form-header";
import { AuthShell } from "@/components/auth/auth-shell";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { OnboardingAuthBar } from "@/components/onboarding/onboarding-auth-bar";
import { EmployeeOnboardingPending } from "@/components/onboarding/employee-onboarding-pending";
import { getSession, getUserCompanies } from "@/lib/auth/session";
import { linkPendingEmployeeMembership } from "@/lib/auth/link-pending-employee";
import { resolvePostAuthRedirect } from "@/lib/auth/post-auth-redirect";
import { createAdminClient } from "@/lib/supabase/admin";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.onboarding");
  return { title: t("title") };
}

export default async function OnboardingPage() {
  const t = await getTranslations("auth.onboarding");
  const locale = await getLocale();
  const user = await getSession();

  let showEmployeePending = false;

  if (user?.email) {
    try {
      await linkPendingEmployeeMembership(user.id, user.email, user.user_metadata);
    } catch (err) {
      console.error("[onboarding] linkPendingEmployeeMembership failed:", err);
    }
    const companies = await getUserCompanies(user.id);
    if (companies.length > 0) {
      const href = await resolvePostAuthRedirect(user.id, companies);
      redirect({ href, locale });
    }

    try {
      const admin = createAdminClient();
      const { data: pending } = await admin
        .from("employees")
        .select("id")
        .ilike("email", user.email.trim())
        .is("member_id", null)
        .neq("status", "terminated")
        .limit(1);
      showEmployeePending = (pending?.length ?? 0) > 0;
    } catch {
      /* admin unavailable */
    }
  }

  return (
    <div className="relative min-h-svh bg-background">
      <OnboardingAuthBar />
      <div className="pt-14">
        <AuthShell minimal>
          <AuthFormHeader
            title={t("title")}
            description={t("pageDescription")}
          />
          {showEmployeePending && user?.email ? (
            <EmployeeOnboardingPending email={user.email} />
          ) : (
            <OnboardingWizard />
          )}
        </AuthShell>
      </div>
    </div>
  );
}
