import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { OnboardingAuthBar } from "@/components/onboarding/onboarding-auth-bar";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.onboarding");
  return { title: t("title") };
}

export default async function OnboardingPage() {
  const t = await getTranslations("auth.onboarding");

  return (
    <div className="relative flex min-h-svh flex-col bg-zinc-950">
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.15] [background-image:linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] [background-size:48px_48px]"
        aria-hidden
      />
      <OnboardingAuthBar />
      <div className="relative flex flex-1 items-center justify-center px-4 pb-12 pt-20">
        <div className="w-full max-w-lg">
          <div className="mb-8 space-y-2 text-center">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">
              {t("wizard.stepLabel")}
            </p>
            <h1 className="text-2xl font-semibold tracking-tight text-white">
              {t("title")}
            </h1>
            <p className="text-sm text-zinc-500">{t("pageDescription")}</p>
          </div>
          <OnboardingWizard />
        </div>
      </div>
    </div>
  );
}
