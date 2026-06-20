import { getTranslations } from "next-intl/server";
import { LegalDocument } from "@/components/marketing/legal-document";

export async function generateMetadata() {
  const t = await getTranslations("marketing.legal.impressum");
  return { title: t("title"), description: t("description") };
}

export default function ImpressumPage() {
  return <LegalDocument namespace="marketing.legal.impressum" />;
}
