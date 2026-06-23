import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { AuthFormHeader } from "@/components/auth/auth-form-header";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";
import { LoginSessionBanner } from "@/components/auth/login-session-banner";
import { ROUTES } from "@/config/constants";
import { redirectTo } from "@/i18n/server-redirect";
import { resolvePostAuthRedirect } from "@/lib/auth/post-auth-redirect";
import { getSession, getUserCompanies } from "@/lib/auth/session";
import { isInvalidAppHref } from "@/lib/navigation/sanitize-href";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.login");
  return { title: t("title") };
}

interface LoginPageProps {
  searchParams: Promise<{ redirect?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const t = await getTranslations("auth.login");
  const { redirect: rawRedirect } = await searchParams;
  const explicitRedirect =
    rawRedirect && !isInvalidAppHref(rawRedirect) ? rawRedirect : null;

  const user = await getSession();
  if (user) {
    const companies = await getUserCompanies(user.id);
    const href = await resolvePostAuthRedirect(user.id, companies, {
      explicitRedirect,
    });
    const bareHref = href.split("?")[0] ?? href;
    if (bareHref !== ROUTES.login) {
      await redirectTo(href);
    }
  }

  return (
    <AuthShell>
      <AuthFormHeader title={t("welcomeBack")} description={t("welcomeDescription")} />
      <LoginSessionBanner />
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
