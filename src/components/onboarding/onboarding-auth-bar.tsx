"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { LogOut } from "lucide-react";
import { toast } from "sonner";
import { signOut } from "@/actions/auth";
import { Link } from "@/i18n/navigation";
import { ROUTES } from "@/config/constants";
import { cn } from "@/lib/utils";

export function OnboardingAuthBar({ className }: { className?: string }) {
  const t = useTranslations("auth.onboarding");
  const tAuth = useTranslations("auth");
  const tErrors = useTranslations("errors");
  const [pending, startTransition] = useTransition();

  function handleSignOut() {
    startTransition(async () => {
      const id = toast.loading(tAuth("signingOut"));
      try {
        await signOut();
      } catch {
        toast.dismiss(id);
        toast.error(tErrors("signOutFailed"));
      }
    });
  }

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 flex items-center justify-between border-b border-white/[0.06] bg-zinc-950/90 px-4 py-3 backdrop-blur-xl sm:px-6",
        className,
      )}
    >
      <Link href={ROUTES.home} className="text-sm font-semibold tracking-tight text-white">
        FeldOps
      </Link>
      <nav className="flex items-center gap-3 text-[13px]">
        <Link
          href={ROUTES.home}
          className="text-zinc-500 transition-colors hover:text-zinc-300"
        >
          {t("backToSite")}
        </Link>
        <Link
          href={ROUTES.login}
          className="text-zinc-500 transition-colors hover:text-zinc-300"
        >
          {t("switchAccount")}
        </Link>
        <button
          type="button"
          onClick={handleSignOut}
          disabled={pending}
          className="inline-flex items-center gap-1.5 text-zinc-500 transition-colors hover:text-zinc-300 disabled:opacity-50"
        >
          <LogOut className="size-3.5" strokeWidth={1.75} />
          {tAuth("signOut")}
        </button>
      </nav>
    </header>
  );
}
