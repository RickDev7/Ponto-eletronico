import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ROUTES } from "@/config/constants";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: ROUTES.features, labelKey: "features" as const },
  { href: ROUTES.pricing, labelKey: "pricing" as const },
  { href: ROUTES.demo, labelKey: "demo" as const },
  { href: ROUTES.contact, labelKey: "contact" as const },
] as const;

export async function MarketingHeader({ className }: { className?: string }) {
  const t = await getTranslations("landing.nav");

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b border-white/[0.06] bg-zinc-950/80 backdrop-blur-xl",
        className,
      )}
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href={ROUTES.home} className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-xl bg-white">
            <span className="text-sm font-bold text-zinc-950">F</span>
          </div>
          <span className="text-sm font-semibold tracking-tight text-white">FeldOps</span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {NAV_ITEMS.map(({ href, labelKey }) => (
            <Link
              key={href}
              href={href}
              className="text-sm text-zinc-400 transition-colors hover:text-white"
            >
              {t(labelKey)}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href={ROUTES.login}
            className="hidden text-sm text-zinc-400 transition-colors hover:text-white sm:block"
          >
            {t("login")}
          </Link>
          <Link
            href={ROUTES.register}
            className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3.5 py-1.5 text-sm font-medium text-zinc-950 transition-colors hover:bg-zinc-100"
          >
            {t("register")}
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </div>
    </header>
  );
}

export async function MarketingFooter() {
  const t = await getTranslations("landing.footer");
  const tNav = await getTranslations("landing.nav");

  return (
    <footer className="border-t border-white/[0.06] bg-zinc-950 py-12">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-lg bg-white">
                <span className="text-xs font-bold text-zinc-950">F</span>
              </div>
              <span className="font-semibold text-white">FeldOps</span>
            </div>
            <p className="text-xs leading-relaxed text-zinc-500">{t("tagline")}</p>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              {t("product")}
            </p>
            <div className="flex flex-col gap-2 text-sm text-zinc-400">
              <Link href={ROUTES.features} className="hover:text-white transition-colors">
                {tNav("features")}
              </Link>
              <Link href={ROUTES.pricing} className="hover:text-white transition-colors">
                {tNav("pricing")}
              </Link>
              <Link href={ROUTES.demo} className="hover:text-white transition-colors">
                {tNav("demo")}
              </Link>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              {t("company")}
            </p>
            <div className="flex flex-col gap-2 text-sm text-zinc-400">
              <Link href={ROUTES.contact} className="hover:text-white transition-colors">
                {tNav("contact")}
              </Link>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              {t("legal")}
            </p>
            <div className="flex flex-col gap-2 text-sm text-zinc-400">
              <Link href={ROUTES.privacy} className="transition-colors hover:text-white">
                {t("privacy")}
              </Link>
              <Link href={ROUTES.terms} className="transition-colors hover:text-white">
                {t("terms")}
              </Link>
              <Link href={ROUTES.impressum} className="transition-colors hover:text-white">
                {t("impressum")}
              </Link>
              <Link href={ROUTES.cookies} className="transition-colors hover:text-white">
                {t("cookies")}
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-white/[0.06] pt-8 sm:flex-row">
          <p className="text-xs text-zinc-600">
            © {new Date().getFullYear()} FeldOps · {t("gdpr")}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-zinc-500">
            <Link href={ROUTES.privacy} className="transition-colors hover:text-zinc-300">
              {t("privacy")}
            </Link>
            <Link href={ROUTES.terms} className="transition-colors hover:text-zinc-300">
              {t("terms")}
            </Link>
            <Link href={ROUTES.impressum} className="transition-colors hover:text-zinc-300">
              {t("impressum")}
            </Link>
            <Link href={ROUTES.login} className="transition-colors hover:text-zinc-300">
              {t("login")}
            </Link>
            <Link href={ROUTES.register} className="transition-colors hover:text-zinc-300">
              {t("register")}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
