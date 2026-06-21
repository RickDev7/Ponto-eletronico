import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ROUTES } from "@/config/constants";
import { IconBox, MarketingCard, PrimaryCta } from "@/components/marketing/marketing-ui";
import {
  Camera,
  ClipboardList,
  FileText,
  Globe,
  MapPin,
  RefreshCw,
  Shield,
  Smartphone,
  Users,
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

export async function generateMetadata() {
  const t = await getTranslations("landing.nav");
  return { title: t("features") };
}

export default async function FeaturesPage() {
  const t = await getTranslations("landing");

  return (
    <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
      <div className="mb-16 max-w-2xl">
        <p className="mb-3 text-sm font-medium uppercase tracking-wider text-[#2563EB]">
          {t("features.eyebrow")}
        </p>
        <h1 className="mb-4 text-3xl font-semibold tracking-tight text-[#0F172A] sm:text-4xl">
          {t("features.title")}
        </h1>
        <p className="text-lg text-[#64748B]">{t("features.description")}</p>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURE_ITEMS.map((item) => (
          <MarketingCard key={item.key} className="p-6">
            <IconBox>
              <item.icon className="size-5" strokeWidth={1.75} />
            </IconBox>
            <h2 className="mb-2 font-semibold text-[#0F172A]">
              {t(`features.items.${item.key}.title`)}
            </h2>
            <p className="text-sm leading-relaxed text-[#64748B]">
              {t(`features.items.${item.key}.description`)}
            </p>
          </MarketingCard>
        ))}
      </div>
      <div className="mt-16 text-center">
        <PrimaryCta href={ROUTES.register}>{t("cta.button")}</PrimaryCta>
      </div>
    </section>
  );
}
