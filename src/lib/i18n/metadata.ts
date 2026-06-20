import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function pageTitle(
  namespace: string,
  key = "title",
): Promise<Metadata> {
  const t = await getTranslations(namespace);
  return { title: t(key) };
}

export const LOCALE_DATE_MAP: Record<string, string> = {
  pt: "pt-BR",
  en: "en-US",
};
