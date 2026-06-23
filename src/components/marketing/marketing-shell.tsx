import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ROUTES } from "@/config/constants";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "#workforce", labelKey: "product" as const },
  { href: "#pricing", labelKey: "pricing" as const },
  { href: ROUTES.demo, labelKey: "demo" as const },
  { href: ROUTES.contact, labelKey: "contact" as const },
] as const;

export async function MarketingHeader({ className }: { className?: string }) {
  const t = await getTranslations("landing.nav");

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b border-border/80 bg-background/85 backdrop-blur-xl",
        className,
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href={ROUTES.home} className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-xl bg-primary shadow-ds-soft">
            <span className="text-sm font-bold text-primary-foreground">F</span>
          </div>
          <span className="text-sm font-semibold tracking-tight text-foreground">FeldOps</span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {NAV_ITEMS.map(({ href, labelKey }) => (
            <Link
              key={href}
              href={href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {t(labelKey)}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href={ROUTES.login}
            className="hidden text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:block"
          >
            {t("login")}
          </Link>
          <Link
            href={ROUTES.register}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-ds-soft transition-colors hover:bg-primary/90"
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
    <footer className="border-t border-border bg-card py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-4 lg:col-span-1">
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary">
                <span className="text-xs font-bold text-primary-foreground">F</span>
              </div>
              <span className="font-semibold text-foreground">FeldOps</span>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">{t("tagline")}</p>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t("product")}
            </p>
            <div className="flex flex-col gap-2.5 text-sm text-muted-foreground">
              <Link href="#workforce" className="transition-colors hover:text-foreground">
                {tNav("product")}
              </Link>
              <Link href="#work-orders" className="transition-colors hover:text-foreground">
                {t("workOrders")}
              </Link>
              <Link href="#employee-app" className="transition-colors hover:text-foreground">
                {t("employeeApp")}
              </Link>
              <Link href={ROUTES.features} className="transition-colors hover:text-foreground">
                {tNav("features")}
              </Link>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t("company")}
            </p>
            <div className="flex flex-col gap-2.5 text-sm text-muted-foreground">
              <Link href={ROUTES.pricing} className="transition-colors hover:text-foreground">
                {tNav("pricing")}
              </Link>
              <Link href={ROUTES.demo} className="transition-colors hover:text-foreground">
                {tNav("demo")}
              </Link>
              <Link href={ROUTES.contact} className="transition-colors hover:text-foreground">
                {tNav("contact")}
              </Link>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t("legal")}
            </p>
            <div className="flex flex-col gap-2.5 text-sm text-muted-foreground">
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

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} FeldOps · {t("gdpr")}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
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
