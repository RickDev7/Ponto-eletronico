import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AuthCenteredLayout } from "@/components/auth/auth-centered-layout";
import { RegisterForm } from "@/components/auth/register-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.register");
  return { title: t("title") };
}

export default async function RegisterPage() {
  const t = await getTranslations("auth.register");

  return (
    <AuthCenteredLayout>
      <div className="space-y-6">
        <div className="space-y-1.5">
          <h2 className="text-2xl font-semibold tracking-tight">
            {t("title")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t("subtitle")}
          </p>
        </div>
        <RegisterForm />
      </div>
    </AuthCenteredLayout>
  );
}
