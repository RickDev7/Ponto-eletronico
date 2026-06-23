import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { sanitizeAppHref } from "@/lib/navigation/sanitize-href";
import type { AppLocale } from "@/i18n/routing";

/**
 * Locale-aware redirect for Server Components.
 * Wraps next-intl navigation so routes keep the active locale prefix.
 */
export async function redirectTo(
  href: string,
  localeOverride?: AppLocale,
): Promise<never> {
  const locale = localeOverride ?? ((await getLocale()) as AppLocale);
  redirect({ href: sanitizeAppHref(href), locale });
}
