import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AuthFormHeader } from "@/components/auth/auth-form-header";
import { AuthShell } from "@/components/auth/auth-shell";
import { UpdatePasswordForm } from "@/components/auth/update-password-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.updatePassword");
  return { title: t("title") };
}

export default async function UpdatePasswordPage() {
  const t = await getTranslations("auth.updatePassword");

  return (
    <AuthShell>
      <AuthFormHeader title={t("title")} description={t("subtitle")} />
      <UpdatePasswordForm />
    </AuthShell>
  );
}
