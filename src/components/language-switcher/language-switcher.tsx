"use client";

import { useEffect } from "react";
import { localeDefinitions } from "@/i18n/config";
import { LOCALE_STORAGE_KEY, type AppLocale } from "@/i18n/routing";
import { useSwitchLocale } from "@/hooks/use-switch-locale";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface LanguageSwitcherProps {
  className?: string;
}

export function LanguageSwitcher({ className }: LanguageSwitcherProps) {
  const { locale, switchLocale, isPending } = useSwitchLocale();

  const current = localeDefinitions.find((l) => l.code === locale) ?? localeDefinitions[0];

  useEffect(() => {
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    } catch {
      /* private mode */
    }
  }, [locale]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground",
          isPending && "opacity-60",
          className,
        )}
        aria-label="Language"
      >
        <span className="text-sm leading-none">{current.flag}</span>
        <span className="hidden sm:inline">{current.label}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[140px]">
        {localeDefinitions.map((item) => (
          <DropdownMenuItem
            key={item.code}
            onSelect={() => switchLocale(item.code)}
            className={cn(item.code === locale && "font-semibold")}
          >
            <span className="mr-2 text-sm">{item.flag}</span>
            {item.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
