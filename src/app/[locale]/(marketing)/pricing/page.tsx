import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ROUTES } from "@/config/constants";
import { MarketingCard } from "@/components/marketing/marketing-ui";
import { CheckCircle2 } from "lucide-react";

const PLAN_KEYS = ["starter", "professional", "enterprise"] as const;

export async function generateMetadata() {
  const t = await getTranslations("landing.nav");
  return { title: t("pricing") };
}

export default async function PricingPage() {
  const t = await getTranslations("landing");

  return (
    <section className="mx-auto max-w-5xl px-4 py-20 sm:px-6 sm:py-28">
      <div className="mb-16 text-center">
        <p className="mb-3 text-sm font-medium uppercase tracking-wider text-[#2563EB]">
          {t("pricing.eyebrow")}
        </p>
        <h1 className="mb-4 text-3xl font-semibold tracking-tight text-[#0F172A] sm:text-4xl">
          {t("pricing.title")}
        </h1>
        <p className="mx-auto max-w-xl text-lg text-[#64748B]">{t("pricing.description")}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {PLAN_KEYS.map((planKey) => {
          const highlight = planKey === "professional";
          const features = t.raw(`pricing.plans.${planKey}.features`) as string[];
          const checkoutHref =
            planKey === "enterprise"
              ? ROUTES.contact
              : `${ROUTES.checkout}?plan=${planKey}`;

          return (
            <MarketingCard key={planKey} highlight={highlight} className="flex flex-col">
              {highlight ? (
                <span className="mb-4 inline-flex w-fit rounded-full bg-[#EFF6FF] px-3 py-1 text-xs font-medium text-[#2563EB]">
                  {t("pricing.popular")}
                </span>
              ) : null}
              <p className="text-sm font-medium text-[#64748B]">
                {t(`pricing.plans.${planKey}.name`)}
              </p>
              <p className="mt-2 text-4xl font-semibold tracking-tight text-[#0F172A]">
                {t(`pricing.plans.${planKey}.price`)}
              </p>
              <p className="text-sm text-[#64748B]">{t(`pricing.plans.${planKey}.period`)}</p>
              <ul className="my-8 flex-1 space-y-3">
                {features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-[#64748B]">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#2563EB]" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Link
                href={checkoutHref}
                className={
                  highlight
                    ? "block w-full rounded-xl bg-[#2563EB] py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-[#1D4ED8]"
                    : "block w-full rounded-xl border border-[#E2E8F0] py-3 text-center text-sm font-semibold text-[#0F172A] transition-colors hover:bg-[#F8FAFC]"
                }
              >
                {t(`pricing.plans.${planKey}.cta`)}
              </Link>
            </MarketingCard>
          );
        })}
      </div>
    </section>
  );
}
