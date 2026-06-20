import { getTranslations } from "next-intl/server";
import { cn } from "@/lib/utils";

interface LegalSection {
  title: string;
  paragraphs: string[];
}

interface LegalDocumentProps {
  namespace: "marketing.legal.privacy" | "marketing.legal.terms" | "marketing.legal.impressum" | "marketing.legal.cookies";
  className?: string;
}

export async function LegalDocument({ namespace, className }: LegalDocumentProps) {
  const t = await getTranslations(namespace);
  const sections = t.raw("sections") as LegalSection[];

  return (
    <article className={cn("mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20", className)}>
      <header className="mb-12 border-b border-white/[0.06] pb-10">
        <p className="mb-3 text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">
          {t("eyebrow")}
        </p>
        <h1 className="mb-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          {t("title")}
        </h1>
        <p className="text-[15px] leading-relaxed text-zinc-400">{t("description")}</p>
        <p className="mt-6 text-xs text-zinc-600">
          {t("lastUpdated", { date: t("lastUpdatedDate") })}
        </p>
      </header>

      <div className="space-y-10">
        {sections.map((section) => (
          <section key={section.title} className="space-y-3">
            <h2 className="text-lg font-semibold tracking-tight text-zinc-100">
              {section.title}
            </h2>
            <div className="space-y-3">
              {section.paragraphs.map((paragraph) => (
                <p
                  key={paragraph.slice(0, 48)}
                  className="text-[15px] leading-relaxed text-zinc-400"
                >
                  {paragraph}
                </p>
              ))}
            </div>
          </section>
        ))}
      </div>
    </article>
  );
}
