import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AuthFormHeader } from "@/components/auth/auth-form-header";
import { AuthShell } from "@/components/auth/auth-shell";
import { RegisterForm } from "@/components/auth/register-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.register");
  return { title: t("title") };
}

export default async function RegisterPage() {
  const t = await getTranslations("auth.register");

  return (
    <AuthShell>
      <AuthFormHeader title={t("title")} description={t("subtitle")} />
      <RegisterForm />
    </AuthShell>
  );
}
