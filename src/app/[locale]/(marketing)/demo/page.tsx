import { getTranslations } from "next-intl/server";
import { ROUTES } from "@/config/constants";
import { PrimaryCta, SecondaryCta } from "@/components/marketing/marketing-ui";
import { Calendar, Play } from "lucide-react";

export async function generateMetadata() {
  const t = await getTranslations("marketing.demo");
  return { title: t("title") };
}

export default async function DemoPage() {
  const t = await getTranslations("marketing.demo");

  return (
    <section className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6 sm:py-28">
      <div className="mb-6 inline-flex size-14 items-center justify-center rounded-2xl border border-[#E2E8F0] bg-white">
        <Play className="size-6 text-[#2563EB]" />
      </div>
      <h1 className="mb-4 text-3xl font-semibold tracking-tight text-[#0F172A] sm:text-4xl">
        {t("title")}
      </h1>
      <p className="mx-auto mb-10 max-w-xl text-lg text-[#64748B]">{t("description")}</p>

      <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
        <PrimaryCta href={ROUTES.register} className="w-full sm:w-auto">
          {t("startTrial")}
        </PrimaryCta>
        <SecondaryCta href={ROUTES.contact} className="w-full sm:w-auto">
          <Calendar className="size-4" />
          {t("bookCall")}
        </SecondaryCta>
      </div>
    </section>
  );
}
