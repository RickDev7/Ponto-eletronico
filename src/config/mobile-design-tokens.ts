/**
 * FeldOps Employee PWA v2 — Mobile Design Tokens
 * Premium native-like field app (Todoist / Linear / Uber Driver inspired)
 */
export const mobileDesignTokens = {
  surface: "employee-mobile",

  colors: {
    background: "#F8FAFC",
    card: "#FFFFFF",
    border: "#E5E7EB",
    primary: "#5B3DF5",
    primaryHover: "#4C31D9",
    success: "#22C55E",
    warning: "#F59E0B",
    danger: "#EF4444",
    text: "#111827",
    secondary: "#6B7280",
    muted: "#F1F5F9",
    darkHeader: "#0F172A",
    darkHeaderText: "#F8FAFC",
  },

  typography: {
    fontFamily: "Inter, var(--font-geist-sans), system-ui, sans-serif",
    minSizePx: 16,
    scale: {
      display: { size: "1.75rem", weight: 700, lineHeight: 1.15 },
      title: { size: "1.375rem", weight: 600, lineHeight: 1.25 },
      body: { size: "1rem", weight: 400, lineHeight: 1.5 },
      bodyMedium: { size: "1rem", weight: 500, lineHeight: 1.5 },
      label: { size: "0.875rem", weight: 500, lineHeight: 1.4 },
      caption: { size: "0.8125rem", weight: 400, lineHeight: 1.35 },
    },
  },

  radius: {
    card: "1.25rem",
    button: "1rem",
    nav: "1.5rem",
    pill: "9999px",
  },

  touch: {
    minTargetPx: 48,
    navHeightPx: 64,
    primaryButtonHeightPx: 52,
  },

  layout: {
    maxContentWidth: "28rem",
    pagePaddingX: "1.25rem",
    sectionGap: "1.5rem",
    navBottomOffset: "calc(5.5rem + env(safe-area-inset-bottom))",
  },

  elevation: {
    card: "0 1px 3px 0 rgb(17 24 39 / 0.04), 0 4px 16px 0 rgb(17 24 39 / 0.06)",
    nav: "0 -4px 24px 0 rgb(17 24 39 / 0.08), 0 8px 32px 0 rgb(91 61 245 / 0.12)",
    sticky: "0 8px 24px 0 rgb(17 24 39 / 0.1)",
  },

  motion: {
    fast: "150ms",
    normal: "220ms",
    ease: "cubic-bezier(0.4, 0, 0.2, 1)",
    pressScale: 0.97,
  },

  navigation: {
    tabs: ["home", "schedule", "jobs", "messages", "profile"] as const,
    hideNavRoutes: ["/mobile/services/", "/mobile/check-in/"] as const,
  },

  offline: {
    cacheKeys: ["home", "jobs", "schedule", "messages", "execution"] as const,
  },
} as const;

export type MobileNavTab = (typeof mobileDesignTokens.navigation.tabs)[number];
export type MobileCacheKey = (typeof mobileDesignTokens.offline.cacheKeys)[number];
