"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { LogOut, Smartphone, UserCog } from "lucide-react";
import { ROUTES } from "@/config/constants";
import { signOut } from "@/actions/auth/actions";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";

interface MobileAccessViewProps {
  slug: string;
  reason: "admin" | "profile_missing";
  mobilePath: string;
}

export function MobileAccessView({ slug, reason, mobilePath }: MobileAccessViewProps) {
  const t = useTranslations("employee.mobile.access");
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    router.push(`${ROUTES.login}?redirect=${encodeURIComponent(mobilePath)}`);
    router.refresh();
  }

  const isProfileMissing = reason === "profile_missing";

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-4 py-12 text-center">
      <div className="mb-6 flex size-16 items-center justify-center rounded-2xl bg-primary/10">
        <Smartphone className="size-8 text-primary" />
      </div>

      <h1 className="text-xl font-semibold tracking-tight">
        {isProfileMissing ? t("profileMissingTitle") : t("adminTitle")}
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        {isProfileMissing ? t("profileMissingDescription") : t("adminDescription")}
      </p>

      <div className="mt-8 w-full space-y-3 text-left">
        <div className="rounded-xl border border-border/60 bg-muted/20 p-4 text-sm">
          <p className="font-medium">{t("stepsTitle")}</p>
          <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-muted-foreground">
            <li>{t("stepRegister")}</li>
            <li>{t("stepLogout")}</li>
            <li>{t("stepLogin")}</li>
            <li>{t("stepOpen", { url: mobilePath })}</li>
          </ol>
        </div>

        <p className="text-xs text-muted-foreground">{t("urlHint", { url: mobilePath })}</p>
      </div>

      <div className="mt-8 flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
        <Button asChild variant="default">
          <Link href={ROUTES.workforceEmployees(slug)}>
            <UserCog className="mr-2 size-4" />
            {t("goToEmployees")}
          </Link>
        </Button>
        {!isProfileMissing ? (
          <Button type="button" variant="outline" onClick={handleSignOut}>
            <LogOut className="mr-2 size-4" />
            {t("signOutAndLogin")}
          </Button>
        ) : (
          <Button asChild variant="outline">
            <Link href={ROUTES.dashboard(slug)}>{t("backToDashboard")}</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
