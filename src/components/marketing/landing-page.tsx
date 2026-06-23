import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ROUTES } from "@/config/constants";
import {
  AiPreview,
  DashboardPreview,
  FinancePreview,
  MobilePreview,
  OperationsPreview,
  PortalPreview,
  WorkforcePreview,
} from "@/components/marketing/app-previews";
import { DeviceFrame, MobileFrame } from "@/components/marketing/device-frame";
import { MARKETING_SCREENSHOTS } from "@/lib/marketing/screenshots";
import {
  FeatureShowcase,
  FloatingKpiCard,
  IndustryPills,
  MarketingCard,
  MarketingSection,
  MetricStrip,
  PrimaryCta,
  ProblemCompareCard,
  SecondaryCta,
  SectionHeader,
  WorkflowPipeline,
} from "@/components/marketing/marketing-ui";
import {
  CalendarRange,
  CheckCircle2,
  ClipboardList,
  Eye,
  FileSpreadsheet,
  MessageCircle,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";

const PLAN_KEYS = ["starter", "professional", "enterprise"] as const;
const FAQ_KEYS = ["whatIs", "industries", "trial", "data", "support", "migration"] as const;
const PROBLEM_KEYS = ["excel", "paper", "whatsapp", "scheduling"] as const;

export async function LandingPageContent() {
  const t = await getTranslations("landing");

  const kpiCards = [
    { key: "todayServices" as const, value: "24", tone: "primary" as const },
    { key: "employeesScheduled" as const, value: "18", tone: "success" as const },
    { key: "revenueMonth" as const, value: "€42k", tone: "default" as const },
    { key: "openTasks" as const, value: "7", tone: "warning" as const },
  ];

  const problemIcons = {
    excel: FileSpreadsheet,
    paper: ClipboardList,
    whatsapp: MessageCircle,
    scheduling: CalendarRange,
  } as const;

  const solutionIcons = {
    excel: Zap,
    paper: Eye,
    whatsapp: Users,
    scheduling: TrendingUp,
  } as const;

  return (
    <>
      {/* 1 — Hero */}
      <section className="relative overflow-hidden border-b border-border bg-background">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_70%_-10%,var(--accent),transparent_55%)]"
          aria-hidden
        />
        <div className="mx-auto grid max-w-6xl gap-14 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:items-center lg:py-28">
          <div className="relative z-10">
            <p className="mb-4 inline-flex items-center rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              {t("hero.badge")}
            </p>
            <h1 className="text-4xl font-semibold leading-[1.08] tracking-tight text-foreground sm:text-5xl lg:text-[3.5rem]">
              {t("hero.title")}
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-muted-foreground sm:text-xl">
              {t("hero.description")}
            </p>
            <div className="mt-6">
              <IndustryPills items={t.raw("hero.industries") as string[]} />
            </div>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <PrimaryCta href={ROUTES.register}>{t("hero.ctaPrimary")}</PrimaryCta>
              <SecondaryCta href={ROUTES.demo}>{t("hero.ctaSecondary")}</SecondaryCta>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">{t("hero.footnote")}</p>
          </div>

          <div className="relative z-10 lg:ml-auto lg:max-w-lg">
            <DeviceFrame
              label="app.feldops.com"
              imageSrc={MARKETING_SCREENSHOTS.dashboard}
              imageAlt={t("hero.screenshotAlt")}
            >
              <DashboardPreview />
            </DeviceFrame>
            <FloatingKpiCard
              label={t("hero.kpis.todayServices")}
              value={kpiCards[0].value}
              tone={kpiCards[0].tone}
              animate
              className="auth-kpi-float absolute -right-2 top-6 w-36"
            />
            <FloatingKpiCard
              label={t("hero.kpis.employeesScheduled")}
              value={kpiCards[1].value}
              tone={kpiCards[1].tone}
              className="auth-kpi-float-delayed absolute -left-4 bottom-20 w-40"
            />
            <FloatingKpiCard
              label={t("hero.kpis.revenueMonth")}
              value={kpiCards[2].value}
              className="auth-kpi-float absolute right-8 -bottom-4 w-36"
            />
            <FloatingKpiCard
              label={t("hero.kpis.openTasks")}
              value={kpiCards[3].value}
              tone={kpiCards[3].tone}
              className="auth-kpi-float-delayed absolute left-12 top-4 w-32"
            />
          </div>
        </div>
      </section>

      {/* 2 — Trusted by */}
      <MarketingSection variant="muted" id="trusted">
        <p className="mb-8 text-center text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          {t("trustedBy.title")}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6">
          {(t.raw("trustedBy.logos") as string[]).map((name) => (
            <span
              key={name}
              className="text-lg font-semibold tracking-tight text-muted-foreground/70 sm:text-xl"
            >
              {name}
            </span>
          ))}
        </div>
        <div className="mt-12 rounded-2xl border border-border bg-card p-8 shadow-ds-soft">
          <MetricStrip
            metrics={(
              t.raw("trustedBy.metrics") as Array<{ value: string; label: string }>
            ).map((m) => ({ value: m.value, label: m.label }))}
          />
        </div>
      </MarketingSection>

      {/* 3 — Problems we solve */}
      <MarketingSection id="problems">
        <SectionHeader
          eyebrow={t("problems.eyebrow")}
          title={t("problems.title")}
          description={t("problems.description")}
        />
        <div className="grid gap-6 sm:grid-cols-2">
          {PROBLEM_KEYS.map((key) => {
            const ReplaceIcon = problemIcons[key];
            const WithIcon = solutionIcons[key];
            return (
              <ProblemCompareCard
                key={key}
                replaceTag={t("problems.replaceTag")}
                withTag={t("problems.withTag")}
                replace={t(`problems.items.${key}.replace`)}
                withLabel={t(`problems.items.${key}.with`)}
                replaceIcon={<ReplaceIcon className="size-5" strokeWidth={1.75} />}
                withIcon={<WithIcon className="size-5" strokeWidth={1.75} />}
              />
            );
          })}
        </div>
      </MarketingSection>

      {/* 4 — Workforce planning */}
      <FeatureShowcase
        id="workforce"
        eyebrow={t("workforce.eyebrow")}
        title={t("workforce.title")}
        description={t("workforce.description")}
        bullets={t.raw("workforce.bullets") as string[]}
        variant="muted"
      >
        <DeviceFrame
          imageSrc={MARKETING_SCREENSHOTS.workforce}
          imageAlt={t("workforce.screenshotAlt")}
        >
          <WorkforcePreview />
        </DeviceFrame>
      </FeatureShowcase>

      {/* 5 — Work orders */}
      <FeatureShowcase
        id="work-orders"
        eyebrow={t("workOrders.eyebrow")}
        title={t("workOrders.title")}
        description={t("workOrders.description")}
        bullets={t.raw("workOrders.bullets") as string[]}
        reverse
      >
        <DeviceFrame
          imageSrc={MARKETING_SCREENSHOTS.operations}
          imageAlt={t("workOrders.screenshotAlt")}
        >
          <OperationsPreview />
        </DeviceFrame>
      </FeatureShowcase>

      {/* 6 — Employee app */}
      <FeatureShowcase
        id="employee-app"
        eyebrow={t("employeeApp.eyebrow")}
        title={t("employeeApp.title")}
        description={t("employeeApp.description")}
        bullets={t.raw("employeeApp.bullets") as string[]}
        variant="muted"
      >
        <MobileFrame imageAlt={t("employeeApp.screenshotAlt")}>
          <MobilePreview />
        </MobileFrame>
      </FeatureShowcase>

      {/* 7 — Client portal */}
      <FeatureShowcase
        id="portal"
        eyebrow={t("clientPortal.eyebrow")}
        title={t("clientPortal.title")}
        description={t("clientPortal.description")}
        bullets={t.raw("clientPortal.bullets") as string[]}
        reverse
      >
        <DeviceFrame
          imageSrc={MARKETING_SCREENSHOTS.portal}
          imageAlt={t("clientPortal.screenshotAlt")}
        >
          <PortalPreview />
        </DeviceFrame>
      </FeatureShowcase>

      {/* 8 — Finance */}
      <FeatureShowcase
        id="finance"
        eyebrow={t("finance.eyebrow")}
        title={t("finance.title")}
        description={t("finance.description")}
        bullets={t.raw("finance.bullets") as string[]}
        variant="muted"
      >
        <DeviceFrame
          imageSrc={MARKETING_SCREENSHOTS.finance}
          imageAlt={t("finance.screenshotAlt")}
        >
          <FinancePreview />
        </DeviceFrame>
      </FeatureShowcase>

      {/* 9 — AI assistant */}
      <FeatureShowcase
        id="ai"
        eyebrow={t("aiAssistant.eyebrow")}
        title={t("aiAssistant.title")}
        description={t("aiAssistant.description")}
        bullets={t.raw("aiAssistant.bullets") as string[]}
        reverse
      >
        <DeviceFrame imageSrc={MARKETING_SCREENSHOTS.ai} imageAlt={t("aiAssistant.screenshotAlt")}>
          <AiPreview />
        </DeviceFrame>
      </FeatureShowcase>

      {/* 10 — How it works */}
      <MarketingSection variant="white" id="how-it-works">
        <SectionHeader
          eyebrow={t("howItWorks.eyebrow")}
          title={t("howItWorks.title")}
          description={t("howItWorks.description")}
        />
        <WorkflowPipeline steps={t.raw("howItWorks.steps") as string[]} />
        <p className="mx-auto mt-10 max-w-2xl text-center text-sm text-muted-foreground">
          {t("howItWorks.footer")}
        </p>
      </MarketingSection>

      {/* 11 — Pricing */}
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
                  <span className="mb-4 inline-flex w-fit rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                    {t("pricing.popular")}
                  </span>
                ) : null}
                <p className="text-sm font-medium text-muted-foreground">
                  {t(`pricing.plans.${planKey}.name`)}
                </p>
                <p className="mt-2 text-4xl font-semibold tracking-tight text-foreground">
                  {t(`pricing.plans.${planKey}.price`)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t(`pricing.plans.${planKey}.period`)}
                </p>
                <ul className="my-8 flex-1 space-y-3">
                  {features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link
                  href={checkoutHref}
                  className={
                    highlight
                      ? "block w-full rounded-xl bg-primary py-3 text-center text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                      : "block w-full rounded-xl border border-border py-3 text-center text-sm font-semibold text-foreground transition-colors hover:bg-muted/50"
                  }
                >
                  {t(`pricing.plans.${planKey}.cta`)}
                </Link>
              </MarketingCard>
            );
          })}
        </div>
        <div className="mt-8 text-center">
          <Link href={ROUTES.pricing} className="text-sm font-medium text-primary hover:text-primary/80">
            {t("pricing.viewPlans")} →
          </Link>
        </div>
      </MarketingSection>

      {/* 12 — FAQ */}
      <MarketingSection variant="muted" id="faq">
        <SectionHeader
          eyebrow={t("faq.eyebrow")}
          title={t("faq.title")}
          description={t("faq.description")}
        />
        <div className="mx-auto max-w-3xl divide-y divide-border rounded-2xl border border-border bg-card shadow-ds-soft">
          {FAQ_KEYS.map((key) => (
            <details key={key} className="group px-6 py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-foreground marker:content-none [&::-webkit-details-marker]:hidden">
                {t(`faq.items.${key}.question`)}
                <span className="text-xl text-muted-foreground transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-3 pr-8 text-sm leading-relaxed text-muted-foreground">
                {t(`faq.items.${key}.answer`)}
              </p>
            </details>
          ))}
        </div>
      </MarketingSection>

      {/* 13 — Final CTA */}
      <MarketingSection>
        <div className="relative overflow-hidden rounded-3xl border border-border bg-card px-6 py-16 text-center shadow-ds-medium sm:px-12">
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,var(--accent),transparent_60%)]"
            aria-hidden
          />
          <div className="relative">
            <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              {t("cta.title")}
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">{t("cta.description")}</p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <PrimaryCta href={ROUTES.register}>{t("cta.button")}</PrimaryCta>
              <SecondaryCta href={ROUTES.demo}>{t("cta.secondary")}</SecondaryCta>
            </div>
          </div>
        </div>
      </MarketingSection>
    </>
  );
}
