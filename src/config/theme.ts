/**
 * Global theme configuration for next-themes + Shadcn/Tailwind (.dark class).
 */
export const THEME_STORAGE_KEY = "feldops-theme";

export const themeConfig = {
  /** CSS attribute applied to <html> — matches Tailwind `dark:` variant */
  attribute: "class" as const,
  /** Default: light mode (enterprise SaaS standard) */
  defaultTheme: "light" as const,
  /** Supported themes including system preference */
  themes: ["light", "dark", "system"] as const,
  enableSystem: true,
  disableTransitionOnChange: true,
  storageKey: THEME_STORAGE_KEY,
} as const;

export type ThemePreference = (typeof themeConfig.themes)[number];
/** @deprecated Use ThemePreference */
export type ThemeName = "light" | "dark";
