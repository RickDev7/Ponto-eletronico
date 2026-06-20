import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { requireCompanyContext } from "@/lib/auth/guards";
import { getTemplates } from "@/actions/templates/actions";
import { TemplatesManager } from "@/components/features/templates/templates-manager";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("templates");
  return { title: t("pageTitle") };
}

interface PageProps {
  params: Promise<{ companySlug: string }>;
}

export default async function TemplatesPage({ params }: PageProps) {
  const { companySlug } = await params;
  const [t, tNav] = await Promise.all([
    getTranslations("templates"),
    getTranslations("navigation"),
  ]);
  const ctx = await requireCompanyContext({ slug: companySlug, minRole: "supervisor" });
  const result = await getTemplates(companySlug);
  const templates = result.success ? result.data! : [];

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div>
        <Link
          href={`/${companySlug}/settings`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="size-4" />
          {tNav("settings")}
        </Link>
        <h1 className="text-base font-semibold">{t("pageTitle")}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {t("pageDescription")}
        </p>
      </div>

      <TemplatesManager
        slug={companySlug}
        templates={templates}
        canEdit={ctx.membership.role !== "employee"}
      />
    </div>
  );
}
