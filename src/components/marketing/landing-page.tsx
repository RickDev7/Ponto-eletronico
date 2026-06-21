import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ROUTES } from "@/config/constants";
import {
  AiPreview,
  DashboardPreview,
  FinancePreview,
  OperationsPreview,
  PortalPreview,
  WorkforcePreview,
} from "@/components/marketing/app-previews";
import { DeviceFrame } from "@/components/marketing/device-frame";
import { MARKETING_SCREENSHOTS } from "@/lib/marketing/screenshots";
import {
  FeatureList,
  IconBox,
  MarketingCard,
  MarketingSection,
  PrimaryCta,
  SecondaryCta,
  SectionHeader,
} from "@/components/marketing/marketing-ui";
import {
  Building2,
  CheckCircle2,
  ClipboardList,
  Globe,
  Quote,
  Sparkles,
  Wrench,
} from "lucide-react";

const BENEFIT_KEYS = ["visibility", "efficiency", "trust", "scale"] as const;
const FEATURE_KEYS = [
  "scheduling",
  "mobile",
  "reporting",
  "compliance",
  "integrations",
  "security",
] as const;
const PLAN_KEYS = ["starter", "professional", "enterprise"] as const;
const FAQ_KEYS = ["whatIs", "industries", "trial", "data", "support", "migration"] as const;

const INDUSTRY_ICONS = {
  cleaning: Building2,
  facility: Wrench,
  maintenance: ClipboardList,
  services: Globe,
} as const;

export async function LandingPageContent() {
  const t = await getTranslations("landing");

  return (
    <>
      {/* 1. Hero */}
      <section className="border-b border-[#E2E8F0] bg-white">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:items-center lg:py-28">
          <div>
            <p className="mb-4 inline-flex items-center rounded-full border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-1 text-xs font-medium text-[#64748B]">
              {t("hero.badge")}
            </p>
            <h1 className="text-4xl font-semibold leading-[1.1] tracking-tight text-[#0F172A] sm:text-5xl lg:text-[3.25rem]">
              {t("hero.title")}
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-[#64748B] sm:text-xl">
              {t("hero.description")}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <PrimaryCta href={ROUTES.register}>{t("hero.ctaPrimary")}</PrimaryCta>
              <SecondaryCta href={ROUTES.demo}>{t("hero.ctaSecondary")}</SecondaryCta>
            </div>
            <p className="mt-4 text-sm text-[#64748B]">{t("hero.footnote")}</p>
          </div>
          <DeviceFrame
            label="app.feldops.com"
            className="lg:ml-auto lg:max-w-lg"
            imageSrc={MARKETING_SCREENSHOTS.dashboard}
            imageAlt={t("hero.screenshotAlt")}
          >
            <DashboardPreview />
          </DeviceFrame>
        </div>
      </section>

      {/* 2. Trusted By */}
      <MarketingSection variant="muted" id="trusted">
        <p className="mb-8 text-center text-sm font-medium uppercase tracking-wider text-[#64748B]">
          {t("trustedBy.title")}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
          {(t.raw("trustedBy.logos") as string[]).map((name) => (
            <span
              key={name}
              className="text-base font-semibold tracking-tight text-[#94A3B8] sm:text-lg"
            >
              {name}
            </span>
          ))}
        </div>
        <p className="mx-auto mt-8 max-w-2xl text-center text-sm text-[#64748B]">
          {t("trustedBy.subtitle")}
        </p>
      </MarketingSection>

      {/* 3. Benefits */}
      <MarketingSection id="benefits">
        <SectionHeader
          eyebrow={t("benefits.eyebrow")}
          title={t("benefits.title")}
          description={t("benefits.description")}
        />
        <div className="grid gap-6 sm:grid-cols-2">
          {BENEFIT_KEYS.map((key) => (
            <MarketingCard key={key}>
              <h3 className="mb-2 text-lg font-semibold text-[#0F172A]">
                {t(`benefits.items.${key}.title`)}
              </h3>
              <p className="leading-relaxed text-[#64748B]">
                {t(`benefits.items.${key}.description`)}
              </p>
            </MarketingCard>
          ))}
        </div>
      </MarketingSection>

      {/* 4. Features */}
      <MarketingSection variant="card" id="features">
        <SectionHeader
          eyebrow={t("features.eyebrow")}
          title={t("features.title")}
          description={t("features.description")}
        />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURE_KEYS.map((key) => (
            <MarketingCard key={key} className="p-6">
              <IconBox>
                <Sparkles className="size-5" strokeWidth={1.75} />
              </IconBox>
              <h3 className="mb-2 font-semibold text-[#0F172A]">
                {t(`features.items.${key}.title`)}
              </h3>
              <p className="text-sm leading-relaxed text-[#64748B]">
                {t(`features.items.${key}.description`)}
              </p>
            </MarketingCard>
          ))}
        </div>
        <div className="mt-10 text-center">
          <Link
            href={ROUTES.features}
            className="text-sm font-medium text-[#2563EB] hover:text-[#1D4ED8]"
          >
            {t("features.viewAll")} →
          </Link>
        </div>
      </MarketingSection>

      {/* 5. Workforce Planning */}
      <MarketingSection id="workforce">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <SectionHeader
              eyebrow={t("workforce.eyebrow")}
              title={t("workforce.title")}
              description={t("workforce.description")}
              align="left"
              className="mb-8"
            />
            <FeatureList items={t.raw("workforce.bullets") as string[]} />
          </div>
          <DeviceFrame
            imageSrc={MARKETING_SCREENSHOTS.workforce}
            imageAlt={t("workforce.screenshotAlt")}
          >
            <WorkforcePreview />
          </DeviceFrame>
        </div>
      </MarketingSection>

      {/* 6. Operations Management */}
      <MarketingSection variant="muted" id="operations">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <DeviceFrame
            className="order-2 lg:order-1"
            imageSrc={MARKETING_SCREENSHOTS.operations}
            imageAlt={t("operations.screenshotAlt")}
          >
            <OperationsPreview />
          </DeviceFrame>
          <div className="order-1 lg:order-2">
            <SectionHeader
              eyebrow={t("operations.eyebrow")}
              title={t("operations.title")}
              description={t("operations.description")}
              align="left"
              className="mb-8"
            />
            <FeatureList items={t.raw("operations.bullets") as string[]} />
          </div>
        </div>
      </MarketingSection>

      {/* 7. Finance */}
      <MarketingSection id="finance">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <SectionHeader
              eyebrow={t("finance.eyebrow")}
              title={t("finance.title")}
              description={t("finance.description")}
              align="left"
              className="mb-8"
            />
            <FeatureList items={t.raw("finance.bullets") as string[]} />
          </div>
          <DeviceFrame
            imageSrc={MARKETING_SCREENSHOTS.finance}
            imageAlt={t("finance.screenshotAlt")}
          >
            <FinancePreview />
          </DeviceFrame>
        </div>
      </MarketingSection>

      {/* 8. Client Portal */}
      <MarketingSection variant="muted" id="portal">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <DeviceFrame
            className="order-2 lg:order-1"
            imageSrc={MARKETING_SCREENSHOTS.portal}
            imageAlt={t("clientPortal.screenshotAlt")}
          >
            <PortalPreview />
          </DeviceFrame>
          <div className="order-1 lg:order-2">
            <SectionHeader
              eyebrow={t("clientPortal.eyebrow")}
              title={t("clientPortal.title")}
              description={t("clientPortal.description")}
              align="left"
              className="mb-8"
            />
            <FeatureList items={t.raw("clientPortal.bullets") as string[]} />
          </div>
        </div>
      </MarketingSection>

      {/* 9. AI Assistant */}
      <MarketingSection id="ai">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <SectionHeader
              eyebrow={t("aiAssistant.eyebrow")}
              title={t("aiAssistant.title")}
              description={t("aiAssistant.description")}
              align="left"
              className="mb-8"
            />
            <FeatureList items={t.raw("aiAssistant.bullets") as string[]} />
          </div>
          <DeviceFrame
            imageSrc={MARKETING_SCREENSHOTS.ai}
            imageAlt={t("aiAssistant.screenshotAlt")}
          >
            <AiPreview />
          </DeviceFrame>
        </div>
      </MarketingSection>

      {/* Industries strip */}
      <MarketingSection variant="card">
        <SectionHeader
          title={t("industries.title")}
          description={t("industries.description")}
        />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {(["cleaning", "facility", "maintenance", "services"] as const).map((key) => {
            const Icon = INDUSTRY_ICONS[key];
            return (
              <MarketingCard key={key} className="p-6 text-center">
                <IconBox className="mx-auto">
                  <Icon className="size-5" strokeWidth={1.75} />
                </IconBox>
                <h3 className="font-semibold text-[#0F172A]">
                  {t(`industries.items.${key}.title`)}
                </h3>
                <p className="mt-2 text-sm text-[#64748B]">
                  {t(`industries.items.${key}.description`)}
                </p>
              </MarketingCard>
            );
          })}
        </div>
      </MarketingSection>

      {/* 10. Testimonials */}
      <MarketingSection variant="muted" id="testimonials">
        <SectionHeader
          eyebrow={t("testimonials.eyebrow")}
          title={t("testimonials.title")}
          description={t("testimonials.description")}
        />
        <div className="grid gap-6 lg:grid-cols-3">
          {(["one", "two", "three"] as const).map((key) => (
            <MarketingCard key={key}>
              <Quote className="mb-4 size-5 text-[#2563EB]" />
              <p className="mb-6 leading-relaxed text-[#0F172A]">
                &ldquo;{t(`testimonials.items.${key}.quote`)}&rdquo;
              </p>
              <div>
                <p className="font-semibold text-[#0F172A]">
                  {t(`testimonials.items.${key}.name`)}
                </p>
                <p className="text-sm text-[#64748B]">
                  {t(`testimonials.items.${key}.role`)}
                </p>
              </div>
            </MarketingCard>
          ))}
        </div>
      </MarketingSection>

      {/* 11. Pricing */}
      <MarketingSection id="pricing">
        <SectionHeader
          eyebrow={t("pricing.eyebrow")}
          title={t("pricing.title")}
          description={t("pricing.description")}
        />
        <div className="grid gap-6 lg:grid-cols-3">
          {PLAN_KEYS.map((planKey) => {
            const highlight = planKey === "professional";
            const features = t.raw(`pricing.plans.${planKey}.features`) as string[];
            const checkoutHref =
              planKey === "enterprise" ? ROUTES.contact : `${ROUTES.checkout}?plan=${planKey}`;

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
                <p className="text-sm text-[#64748B]">
                  {t(`pricing.plans.${planKey}.period`)}
                </p>
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
        <div className="mt-8 text-center">
          <Link
            href={ROUTES.pricing}
            className="text-sm font-medium text-[#2563EB] hover:text-[#1D4ED8]"
          >
            {t("pricing.viewPlans")} →
          </Link>
        </div>
      </MarketingSection>

      {/* 12. FAQ */}
      <MarketingSection variant="muted" id="faq">
        <SectionHeader
          eyebrow={t("faq.eyebrow")}
          title={t("faq.title")}
          description={t("faq.description")}
        />
        <div className="mx-auto max-w-3xl divide-y divide-[#E2E8F0] rounded-2xl border border-[#E2E8F0] bg-white">
          {FAQ_KEYS.map((key) => (
            <details key={key} className="group px-6 py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-[#0F172A] marker:content-none [&::-webkit-details-marker]:hidden">
                {t(`faq.items.${key}.question`)}
                <span className="text-[#64748B] transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-3 pr-8 text-sm leading-relaxed text-[#64748B]">
                {t(`faq.items.${key}.answer`)}
              </p>
            </details>
          ))}
        </div>
      </MarketingSection>

      {/* 13. CTA */}
      <MarketingSection>
        <div className="rounded-3xl border border-[#E2E8F0] bg-white px-6 py-16 text-center sm:px-12">
          <h2 className="text-3xl font-semibold tracking-tight text-[#0F172A] sm:text-4xl">
            {t("cta.title")}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-[#64748B]">{t("cta.description")}</p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <PrimaryCta href={ROUTES.register}>{t("cta.button")}</PrimaryCta>
            <SecondaryCta href={ROUTES.contact}>{t("cta.secondary")}</SecondaryCta>
          </div>
        </div>
      </MarketingSection>
    </>
  );
}
