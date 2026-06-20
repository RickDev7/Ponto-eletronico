import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";
import { hasLocale } from "next-intl";
import {
  defaultLocale,
  fallbackLocale,
  locales,
  LOCALE_STORAGE_KEY,
  type AppLocale,
} from "./routing";

async function loadMessages(locale: AppLocale) {
  return (await import(`../messages/${locale}.json`)).default;
}

function parseAcceptLanguage(header: string | null): AppLocale | null {
  if (!header) return null;
  const preferred = header
    .split(",")
    .map((part) => part.trim().split(";")[0]?.toLowerCase())
    .filter(Boolean);

  for (const lang of preferred) {
    const code = lang!.split("-")[0] as AppLocale;
    if (hasLocale(locales, code)) return code;
  }
  return null;
}

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  let locale: AppLocale = defaultLocale;

  if (hasLocale(locales, requested)) {
    locale = requested;
  } else {
    const cookieStore = await cookies();
    const cookieLocale = cookieStore.get(LOCALE_STORAGE_KEY)?.value;
    if (cookieLocale && hasLocale(locales, cookieLocale)) {
      locale = cookieLocale as AppLocale;
    } else {
      const headerStore = await headers();
      locale =
        parseAcceptLanguage(headerStore.get("accept-language")) ?? defaultLocale;
    }
  }

  let messages = await loadMessages(locale);
  if (locale !== fallbackLocale) {
    try {
      const fallbackMessages = await loadMessages(fallbackLocale);
      messages = deepMerge(fallbackMessages, messages);
    } catch {
      /* fallback optional */
    }
  }

  return { locale, messages };
});

function deepMerge<T extends Record<string, unknown>>(
  base: T,
  override: T,
): T {
  const result = { ...base } as Record<string, unknown>;
  for (const key of Object.keys(override)) {
    const b = base[key];
    const o = override[key];
    if (
      b &&
      o &&
      typeof b === "object" &&
      typeof o === "object" &&
      !Array.isArray(b) &&
      !Array.isArray(o)
    ) {
      result[key] = deepMerge(
        b as Record<string, unknown>,
        o as Record<string, unknown>,
      );
    } else {
      result[key] = o;
    }
  }
  return result as T;
}
