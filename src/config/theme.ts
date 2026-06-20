/**
 * Global theme configuration for next-themes + Shadcn/Tailwind (.dark class).
 */
export const THEME_STORAGE_KEY = "feldops-theme";

export const themeConfig = {
  /** CSS attribute applied to <html> — matches Tailwind `dark:` variant */
  attribute: "class" as const,
  /** Default: dark mode */
  defaultTheme: "dark" as const,
  /** Supported themes (no system — explicit light/dark only) */
  themes: ["light", "dark"] as const,
  enableSystem: false,
  disableTransitionOnChange: true,
  storageKey: THEME_STORAGE_KEY,
} as const;

export type ThemeName = (typeof themeConfig.themes)[number];
