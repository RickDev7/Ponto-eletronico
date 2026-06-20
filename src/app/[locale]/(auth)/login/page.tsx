import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { LoginForm } from "@/components/auth/login-form";
import { LoginLogo } from "@/components/auth/login-logo";
import { LoginSessionBanner } from "@/components/auth/login-session-banner";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.login");
  return { title: t("title") };
}

export default async function LoginPage() {
  const t = await getTranslations("auth.login");

  return (
    <div className="relative flex min-h-svh w-full items-center justify-center overflow-hidden bg-zinc-950 px-4 py-12 sm:px-6">
      {/* Background */}
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(255,255,255,0.06),transparent)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,#09090b_0%,#0a0a0a_50%,#09090b_100%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.25] [background-image:linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] [background-size:64px_64px] [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_75%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute left-1/2 top-0 size-[600px] -translate-x-1/2 rounded-full bg-white/[0.02] blur-3xl"
        aria-hidden
      />

      <div
        className={cn(
          "relative w-full max-w-[460px]",
          "animate-in fade-in duration-500 ease-out",
        )}
      >
        <div
          className={cn(
            "rounded-2xl border border-white/[0.08] bg-zinc-900/60 p-8 shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_24px_80px_rgba(0,0,0,0.5)] backdrop-blur-xl",
            "animate-in fade-in slide-in-from-bottom-2 duration-700 ease-out",
            "sm:p-10",
          )}
        >
          <LoginLogo className="mb-3" showName={false} />

          <p className="mb-8 text-center text-xl font-semibold tracking-[-0.02em] text-white">
            FeldOps
          </p>

          <header className="mb-8 space-y-2 text-center">
            <h1 className="text-[1.875rem] font-semibold tracking-[-0.03em] text-white sm:text-[2rem]">
              {t("welcomeBack")}
            </h1>
            <p className="text-[15px] leading-relaxed text-zinc-500">
              {t("welcomeDescription")}
            </p>
          </header>

          <LoginSessionBanner />
          <LoginForm />
        </div>

        <p className="mt-8 text-center text-xs text-zinc-600">
          © {new Date().getFullYear()} FeldOps
        </p>
      </div>
    </div>
  );
}
