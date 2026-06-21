"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { LogOut } from "lucide-react";
import { toast } from "sonner";
import { signOut } from "@/actions/auth";
import { Link, useRouter } from "@/i18n/navigation";
import { ROUTES } from "@/config/constants";
import { cn } from "@/lib/utils";

export function OnboardingAuthBar({ className }: { className?: string }) {
  const t = useTranslations("auth.onboarding");
  const tAuth = useTranslations("auth");
  const tErrors = useTranslations("errors");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleSignOut() {
    startTransition(async () => {
      const id = toast.loading(tAuth("signingOut"));
      const result = await signOut();
      toast.dismiss(id);
      if (!result.success) {
        toast.error(tErrors("signOutFailed"));
        return;
      }
      router.push(ROUTES.login);
      router.refresh();
    });
  }

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 flex items-center justify-between border-b border-border bg-background/90 px-4 py-3 backdrop-blur-xl sm:px-6",
        className,
      )}
    >
      <Link href={ROUTES.home} className="text-sm font-semibold tracking-tight text-foreground">
        FeldOps
      </Link>
      <nav className="flex items-center gap-3 text-[13px]">
        <Link
          href={ROUTES.home}
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          {t("backToSite")}
        </Link>
        <Link
          href={ROUTES.login}
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          {t("switchAccount")}
        </Link>
        <button
          type="button"
          onClick={handleSignOut}
          disabled={pending}
          className="inline-flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
        >
          <LogOut className="size-3.5" strokeWidth={1.75} />
          {tAuth("signOut")}
        </button>
      </nav>
    </header>
  );
}
