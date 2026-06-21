import { getTranslations } from "next-intl/server";
import { ContactForm } from "@/components/marketing/contact-form";

export async function generateMetadata() {
  const t = await getTranslations("marketing.contact");
  return { title: t("title") };
}

export default async function ContactPage() {
  const t = await getTranslations("marketing.contact");

  return (
    <section className="mx-auto max-w-xl px-4 py-20 sm:px-6 sm:py-28">
      <div className="mb-10 text-center">
        <h1 className="mb-3 text-3xl font-semibold tracking-tight text-[#0F172A] sm:text-4xl">
          {t("title")}
        </h1>
        <p className="text-lg text-[#64748B]">{t("description")}</p>
      </div>
      <ContactForm />
    </section>
  );
}
