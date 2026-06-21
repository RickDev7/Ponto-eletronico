import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { resolvePostAuthRedirect } from "@/lib/auth/post-auth-redirect";
import { getSession, getUserCompanies } from "@/lib/auth/session";
import { ROUTES } from "@/config/constants";
import { LoginSignOutButton } from "@/components/auth/login-sign-out-button";

export async function LoginSessionBanner() {
  const user = await getSession();
  if (!user) return null;

  const t = await getTranslations("auth.login");
  const companies = await getUserCompanies(user.id);
  const continueHref = await resolvePostAuthRedirect(user.id, companies);
  const continueLabel =
    continueHref === ROUTES.onboarding
      ? t("continueOnboarding")
      : t("continueToWorkspace");

  return (
    <div className="mb-6 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-center text-[13px] text-zinc-400">
      <p className="mb-2">{t("alreadySignedIn", { email: user.email ?? "" })}</p>
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
        <Link href={continueHref} className="font-medium text-white hover:text-zinc-200">
          {continueLabel}
        </Link>
        <span className="text-zinc-600">·</span>
        <Link href={ROUTES.home} className="hover:text-zinc-300">
          {t("backToSite")}
        </Link>
        <span className="text-zinc-600">·</span>
        <LoginSignOutButton />
      </div>
    </div>
  );
}
