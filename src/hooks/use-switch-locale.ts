"use client";

import { useTransition } from "react";
import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { LOCALE_STORAGE_KEY, type AppLocale } from "@/i18n/routing";

export function useSwitchLocale() {
  const locale = useLocale() as AppLocale;
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  function switchLocale(next: AppLocale) {
    if (next === locale) return;
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, next);
    } catch {
      /* private mode */
    }
    document.cookie = `${LOCALE_STORAGE_KEY}=${next};path=/;max-age=31536000;SameSite=Lax`;
    startTransition(() => {
      router.replace(pathname, { locale: next });
      router.refresh();
    });
  }

  return { locale, switchLocale, isPending };
}
