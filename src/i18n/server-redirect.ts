import { redirect } from "@/i18n/navigation";

/**
 * Locale-aware redirect for Server Components.
 * Wraps next-intl navigation so routes keep the active locale prefix.
 */
export function redirectTo(href: string): never {
  redirect(href);
}
