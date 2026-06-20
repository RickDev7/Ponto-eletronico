import { getTranslations } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { getSession, getUserCompanies } from "@/lib/auth/session";
import { ROUTES } from "@/config/constants";
import {
  ArrowRight,
  Camera,
  CheckCircle2,
  ClipboardList,
  FileText,
  Globe,
  MapPin,
  RefreshCw,
  Shield,
  Smartphone,
  Users,
  Zap,
} from "lucide-react";

const FEATURE_ITEMS = [
  { key: "taskManagement", icon: ClipboardList },
  { key: "gpsCheckIn", icon: MapPin },
  { key: "photos", icon: Camera },
  { key: "recurring", icon: RefreshCw },
  { key: "reports", icon: FileText },
  { key: "team", icon: Users },
  { key: "pwa", icon: Smartphone },
  { key: "gdpr", icon: Shield },
  { key: "multiTenant", icon: Globe },
] as const;

const SERVICE_ITEMS = [
  { key: "stairwell", emoji: "🏢" },
  { key: "garden", emoji: "🌱" },
  { key: "winter", emoji: "❄️" },
  { key: "windows", emoji: "🪟" },
] as const;

export default async function LandingPage() {
  const t = await getTranslations("landing");
  const user = await getSession();

  if (user) {
    const companies = await getUserCompanies(user.id);
    if (companies.length === 1) {
      const first = companies[0]!;
      const company = Array.isArray(first.company) ? first.company[0] : first.company;
      if (company?.slug) redirect(ROUTES.dashboard(company.slug));
    } else if (companies.length > 1) {
      redirect(ROUTES.selectCompany);
    }
  }

  return (
    <>
      <section className="mx-auto max-w-6xl px-4 pb-24 pt-20 text-center sm:px-6">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-xs font-medium text-zinc-400">
          <Zap className="size-3 text-zinc-300" />
          {t("hero.badge")}
        </div>
        <h1 className="mb-6 text-4xl font-semibold leading-tight tracking-[-0.03em] sm:text-5xl lg:text-6xl">
          {t("hero.title")}{" "}
          <span className="text-zinc-400">{t("hero.titleHighlight")}</span>
        </h1>
        <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-zinc-400">
          {t("hero.description")}
        </p>
        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href={ROUTES.register}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-zinc-950 transition-colors hover:bg-zinc-100 sm:w-auto"
          >
            {t("hero.ctaPrimary")}
            <ArrowRight className="size-4" />
          </Link>
          <Link
            href={ROUTES.demo}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/[0.1] bg-white/[0.03] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/[0.06] sm:w-auto"
          >
            {t("hero.ctaSecondary")}
          </Link>
        </div>
        <p className="mt-4 text-xs text-zinc-600">{t("hero.footnote")}</p>
      </section>

      <section className="border-y border-white/[0.06] bg-white/[0.02] py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-12 text-center">
            <h2 className="mb-3 text-2xl font-semibold tracking-tight sm:text-3xl">
              {t("features.title")}
            </h2>
            <p className="mx-auto max-w-xl text-zinc-400">{t("features.description")}</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURE_ITEMS.slice(0, 6).map((item) => (
              <div
                key={item.key}
                className="rounded-2xl border border-white/[0.06] bg-zinc-900/40 p-5 transition-colors hover:border-white/[0.12]"
              >
                <div className="mb-3 flex size-9 items-center justify-center rounded-xl bg-white/[0.06]">
                  <item.icon className="size-4 text-zinc-300" strokeWidth={1.75} />
                </div>
                <h3 className="mb-1 text-sm font-semibold">{t(`features.items.${item.key}.title`)}</h3>
                <p className="text-xs leading-relaxed text-zinc-500">
                  {t(`features.items.${item.key}.description`)}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link
              href={ROUTES.features}
              className="text-sm text-zinc-400 transition-colors hover:text-white"
            >
              {t("features.viewAll")} →
            </Link>
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-12 text-center">
            <h2 className="mb-3 text-2xl font-semibold tracking-tight sm:text-3xl">
              {t("services.title")}
            </h2>
            <p className="text-zinc-400">{t("services.description")}</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {SERVICE_ITEMS.map((item) => (
              <div
                key={item.key}
                className="rounded-2xl border border-white/[0.06] p-5 text-center transition-colors hover:border-white/[0.12]"
              >
                <div className="mb-2 text-3xl">{item.emoji}</div>
                <h3 className="text-sm font-semibold">{t(`services.items.${item.key}.title`)}</h3>
                <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                  {t(`services.items.${item.key}.description`)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-white/[0.06] bg-white/[0.02] py-20">
        <div className="mx-auto max-w-2xl px-4 text-center sm:px-6">
          <h2 className="mb-3 text-2xl font-semibold tracking-tight sm:text-3xl">
            {t("pricing.title")}
          </h2>
          <p className="mb-8 text-zinc-400">{t("pricing.description")}</p>
          <Link
            href={ROUTES.pricing}
            className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-zinc-950 transition-colors hover:bg-zinc-100"
          >
            {t("pricing.viewPlans")}
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto max-w-2xl space-y-6 px-4 text-center sm:px-6">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t("cta.title")}</h2>
          <p className="text-zinc-400">{t("cta.description")}</p>
          <Link
            href={ROUTES.register}
            className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-3.5 text-sm font-semibold text-zinc-950 transition-colors hover:bg-zinc-100"
          >
            {t("cta.button")}
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>
    </>
  );
}
