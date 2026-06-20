import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ROUTES } from "@/config/constants";
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
import { ArrowRight } from "lucide-react";

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
    <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <div className="mb-16 max-w-2xl">
        <h1 className="mb-4 text-3xl font-semibold tracking-tight sm:text-4xl">
          {t("features.title")}
        </h1>
        <p className="text-lg text-zinc-400">{t("features.description")}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURE_ITEMS.map((item) => (
          <div
            key={item.key}
            className="rounded-2xl border border-white/[0.06] bg-zinc-900/40 p-6 transition-colors hover:border-white/[0.12]"
          >
            <div className="mb-4 flex size-10 items-center justify-center rounded-xl bg-white/[0.06]">
              <item.icon className="size-5 text-zinc-300" strokeWidth={1.75} />
            </div>
            <h2 className="mb-2 font-semibold">{t(`features.items.${item.key}.title`)}</h2>
            <p className="text-sm leading-relaxed text-zinc-500">
              {t(`features.items.${item.key}.description`)}
            </p>
          </div>
        ))}
      </div>
      <div className="mt-16 text-center">
        <Link
          href={ROUTES.register}
          className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-zinc-950 transition-colors hover:bg-zinc-100"
        >
          {t("cta.button")}
          <ArrowRight className="size-4" />
        </Link>
      </div>
    </section>
  );
}
