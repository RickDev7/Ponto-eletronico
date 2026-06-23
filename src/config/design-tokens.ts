/**
 * Design token reference — source of truth is `src/app/globals.css`.
 * Use CSS variables / Tailwind utilities in components; this file is for
 * documentation, marketing fallbacks, and non-CSS contexts.
 */
export const designTokens = {
  colors: {
    light: {
      background: "#F8FAFC",
      foreground: "#0F172A",
      card: "#FFFFFF",
      border: "#E2E8F0",
      primary: "#2563EB",
      secondary: "#64748B",
      muted: "#F1F5F9",
      success: "#22C55E",
      warning: "#F59E0B",
      danger: "#EF4444",
      sidebar: "#FFFFFF",
    },
    dark: {
      background: "#0F172A",
      foreground: "#F8FAFC",
      card: "#1E293B",
      border: "#334155",
      primary: "#3B82F6",
      secondary: "#CBD5E1",
      muted: "#1E293B",
      success: "#22C55E",
      warning: "#F59E0B",
      danger: "#EF4444",
      sidebar: "#111827",
    },
  },
  radius: {
    sm: "0.25rem",
    md: "0.5rem",
    lg: "0.75rem",
    xl: "1rem",
  },
  spacing: {
    4: "0.25rem",
    8: "0.5rem",
    12: "0.75rem",
    16: "1rem",
    24: "1.5rem",
    32: "2rem",
    48: "3rem",
    64: "4rem",
  },
  shadow: {
    soft: "0 1px 2px 0 rgb(15 23 42 / 0.05)",
    medium: "0 4px 12px 0 rgb(15 23 42 / 0.08)",
    large: "0 8px 24px 0 rgb(15 23 42 / 0.12)",
  },
  typography: {
    display: { size: "3rem", weight: 700, lineHeight: 1.1 },
    h1: { size: "2.25rem", weight: 600, lineHeight: 1.2 },
    h2: { size: "1.875rem", weight: 600, lineHeight: 1.25 },
    h3: { size: "1.5rem", weight: 600, lineHeight: 1.3 },
    body: { size: "1rem", weight: 400, lineHeight: 1.5 },
    small: { size: "0.875rem", weight: 400, lineHeight: 1.5 },
  },
  animation: {
    fast: "150ms",
    normal: "200ms",
    slow: "300ms",
  },
} as const;

export type DesignTokenColor = keyof typeof designTokens.colors.light;
