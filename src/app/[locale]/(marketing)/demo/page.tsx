import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ROUTES } from "@/config/constants";
import { ArrowRight, Calendar, Play } from "lucide-react";

export async function generateMetadata() {
  const t = await getTranslations("marketing.demo");
  return { title: t("title") };
}

export default async function DemoPage() {
  const t = await getTranslations("marketing.demo");

  return (
    <section className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
      <div className="mb-6 inline-flex size-14 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.04]">
        <Play className="size-6 text-zinc-300" />
      </div>
      <h1 className="mb-4 text-3xl font-semibold tracking-tight sm:text-4xl">{t("title")}</h1>
      <p className="mx-auto mb-10 max-w-xl text-lg text-zinc-400">{t("description")}</p>

      <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Link
          href={ROUTES.register}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-zinc-950 transition-colors hover:bg-zinc-100 sm:w-auto"
        >
          {t("startTrial")}
          <ArrowRight className="size-4" />
        </Link>
        <Link
          href={ROUTES.contact}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 px-6 py-3 text-sm font-semibold transition-colors hover:bg-white/[0.06] sm:w-auto"
        >
          <Calendar className="size-4" />
          {t("bookCall")}
        </Link>
      </div>
    </section>
  );
}
