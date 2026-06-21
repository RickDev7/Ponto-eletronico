"use client";

import { useCallback, useTransition } from "react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { updateThemePreference } from "@/actions/settings/actions";
import type { ThemePreference } from "@/config/theme";

export function useThemePreference(slug?: string) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [pending, startTransition] = useTransition();

  const applyTheme = useCallback(
    (next: ThemePreference) => {
      setTheme(next);
      if (!slug) return;
      startTransition(async () => {
        const result = await updateThemePreference(slug, next);
        if (!result.success) toast.error(result.error);
      });
    },
    [setTheme, slug],
  );

  return {
    theme: (theme ?? "light") as ThemePreference,
    resolvedTheme,
    applyTheme,
    pending,
    isDark: (resolvedTheme ?? theme) === "dark",
  };
}
