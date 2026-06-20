import { defineRouting } from "next-intl/routing";

/** Active locales — add new locale here + messages file to expand */
export const locales = ["pt", "en"] as const;

/** Reserved for future expansion (no code changes beyond routing + messages) */
export const futureLocales = ["de", "es", "fr", "it", "nl"] as const;

export type AppLocale = (typeof locales)[number];

export const defaultLocale: AppLocale = "pt";

export const fallbackLocale: AppLocale = "en";

export const LOCALE_STORAGE_KEY = "feldops-locale";

export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: "always",
});
