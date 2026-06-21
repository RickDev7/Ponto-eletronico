"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "next-themes";
import type { ThemePreference } from "@/config/theme";

interface ThemePreferenceSyncProps {
  /** Saved preference from profiles.theme */
  profileTheme?: string | null;
}

export function ThemePreferenceSync({ profileTheme }: ThemePreferenceSyncProps) {
  const { setTheme } = useTheme();
  const synced = useRef(false);

  useEffect(() => {
    if (synced.current || !profileTheme) return;
    if (profileTheme === "light" || profileTheme === "dark" || profileTheme === "system") {
      setTheme(profileTheme as ThemePreference);
      synced.current = true;
    }
  }, [profileTheme, setTheme]);

  return null;
}
