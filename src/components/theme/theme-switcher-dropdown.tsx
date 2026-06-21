"use client";

import { useEffect, useState } from "react";
import { Check, Monitor, Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { ThemePreference } from "@/config/theme";
import { useThemePreference } from "@/hooks/use-theme-preference";

interface ThemeSwitcherDropdownProps {
  slug?: string;
  className?: string;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
}

const OPTIONS: { value: ThemePreference; icon: typeof Sun; emoji: string }[] = [
  { value: "light", icon: Sun, emoji: "☀️" },
  { value: "dark", icon: Moon, emoji: "🌙" },
  { value: "system", icon: Monitor, emoji: "💻" },
];

export function ThemeSwitcherDropdown({
  slug,
  className,
  variant = "ghost",
  size = "icon",
}: ThemeSwitcherDropdownProps) {
  const t = useTranslations("common");
  const { theme, applyTheme, pending } = useThemePreference(slug);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const activeTheme = mounted ? theme : "light";
  const ActiveIcon = OPTIONS.find((o) => o.value === activeTheme)?.icon ?? Sun;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(buttonVariants({ variant, size }), "size-9", className)}
        aria-label={t("theme")}
        disabled={pending}
      >
        {mounted ? (
          <ActiveIcon className="size-4" />
        ) : (
          <Sun className="size-4 text-muted-foreground" />
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
            {t("theme")}
          </DropdownMenuLabel>
          {OPTIONS.map(({ value, emoji }) => (
            <DropdownMenuItem
              key={value}
              className="gap-2"
              onClick={() => applyTheme(value)}
            >
              <span aria-hidden>{emoji}</span>
              <span className="flex-1">{t(value)}</span>
              {activeTheme === value ? (
                <Check className="size-4 text-primary" />
              ) : null}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
