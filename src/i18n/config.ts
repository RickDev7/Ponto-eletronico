import type { AppLocale } from "./routing";

export interface LocaleDefinition {
  code: AppLocale;
  label: string;
  flag: string;
}

export const localeDefinitions: LocaleDefinition[] = [
  { code: "pt", label: "Português", flag: "🇧🇷" },
  { code: "en", label: "English", flag: "🇺🇸" },
];
