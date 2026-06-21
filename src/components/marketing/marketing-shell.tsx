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
        "sticky top-0 z-40 border-b border-[#E2E8F0] bg-white/90 backdrop-blur-xl",
        className,
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href={ROUTES.home} className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-xl bg-primary">
            <span className="text-sm font-bold text-primary-foreground">F</span>
          </div>
          <span className="text-sm font-semibold tracking-tight text-foreground">FeldOps</span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {NAV_ITEMS.map(({ href, labelKey }) => (
            <Link
              key={href}
              href={href}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {t(labelKey)}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href={ROUTES.login}
            className="hidden text-sm text-muted-foreground transition-colors hover:text-foreground sm:block"
          >
            {t("login")}
          </Link>
          <Link
            href={ROUTES.register}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
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
    <footer className="border-t border-[#E2E8F0] bg-white py-14">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-lg bg-primary">
                <span className="text-xs font-bold text-primary-foreground">F</span>
              </div>
              <span className="font-semibold text-foreground">FeldOps</span>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">{t("tagline")}</p>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t("product")}
            </p>
            <div className="flex flex-col gap-2 text-sm text-muted-foreground">
              <Link href={ROUTES.features} className="hover:text-foreground transition-colors">
                {tNav("features")}
              </Link>
              <Link href={ROUTES.pricing} className="hover:text-foreground transition-colors">
                {tNav("pricing")}
              </Link>
              <Link href={ROUTES.demo} className="hover:text-foreground transition-colors">
                {tNav("demo")}
              </Link>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t("company")}
            </p>
            <div className="flex flex-col gap-2 text-sm text-muted-foreground">
              <Link href={ROUTES.contact} className="hover:text-foreground transition-colors">
                {tNav("contact")}
              </Link>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t("legal")}
            </p>
            <div className="flex flex-col gap-2 text-sm text-muted-foreground">
              <Link href={ROUTES.privacy} className="transition-colors hover:text-foreground">
                {t("privacy")}
              </Link>
              <Link href={ROUTES.terms} className="transition-colors hover:text-foreground">
                {t("terms")}
              </Link>
              <Link href={ROUTES.impressum} className="transition-colors hover:text-foreground">
                {t("impressum")}
              </Link>
              <Link href={ROUTES.cookies} className="transition-colors hover:text-foreground">
                {t("cookies")}
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} FeldOps · {t("gdpr")}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
            <Link href={ROUTES.privacy} className="transition-colors hover:text-foreground">
              {t("privacy")}
            </Link>
            <Link href={ROUTES.terms} className="transition-colors hover:text-foreground">
              {t("terms")}
            </Link>
            <Link href={ROUTES.impressum} className="transition-colors hover:text-foreground">
              {t("impressum")}
            </Link>
            <Link href={ROUTES.login} className="transition-colors hover:text-foreground">
              {t("login")}
            </Link>
            <Link href={ROUTES.register} className="transition-colors hover:text-foreground">
              {t("register")}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
