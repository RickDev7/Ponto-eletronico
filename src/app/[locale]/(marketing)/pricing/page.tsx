import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ROUTES } from "@/config/constants";
import { CheckCircle2 } from "lucide-react";

const PLAN_KEYS = ["starter", "professional", "enterprise"] as const;

export async function generateMetadata() {
  const t = await getTranslations("landing.nav");
  return { title: t("pricing") };
}

export default async function PricingPage() {
  const t = await getTranslations("landing");

  return (
    <section className="mx-auto max-w-5xl px-4 py-20 sm:px-6">
      <div className="mb-16 text-center">
        <h1 className="mb-4 text-3xl font-semibold tracking-tight sm:text-4xl">
          {t("pricing.title")}
        </h1>
        <p className="mx-auto max-w-xl text-zinc-400">{t("pricing.description")}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {PLAN_KEYS.map((planKey) => {
          const highlight = planKey === "professional";
          const features = t.raw(`pricing.plans.${planKey}.features`) as string[];
          const checkoutHref =
            planKey === "enterprise"
              ? ROUTES.contact
              : `${ROUTES.checkout}?plan=${planKey}`;

          return (
            <div
              key={planKey}
              className={`rounded-2xl border p-6 ${
                highlight
                  ? "border-white/20 bg-white/[0.06] ring-1 ring-white/10"
                  : "border-white/[0.06] bg-zinc-900/40"
              }`}
            >
              {highlight && (
                <span className="mb-4 inline-flex rounded-full bg-white px-2.5 py-0.5 text-[10px] font-medium text-zinc-950">
                  {t("pricing.popular")}
                </span>
              )}
              <p className="text-sm text-zinc-500">{t(`pricing.plans.${planKey}.name`)}</p>
              <p className="mt-1 text-3xl font-semibold tracking-tight">
                {t(`pricing.plans.${planKey}.price`)}
              </p>
              <p className="text-xs text-zinc-600">{t(`pricing.plans.${planKey}.period`)}</p>
              <ul className="my-6 space-y-2">
                {features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-zinc-400">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-zinc-500" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Link
                href={checkoutHref}
                className={`block w-full rounded-xl py-2.5 text-center text-sm font-medium transition-colors ${
                  highlight
                    ? "bg-white text-zinc-950 hover:bg-zinc-100"
                    : "border border-white/10 text-white hover:bg-white/[0.06]"
                }`}
              >
                {t(`pricing.plans.${planKey}.cta`)}
              </Link>
            </div>
          );
        })}
      </div>
    </section>
  );
}
