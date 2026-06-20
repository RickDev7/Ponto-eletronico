/**
 * Design tokens are defined as CSS variables in src/app/globals.css
 * and exposed to Tailwind via @theme inline.
 *
 * Utilities: bg-ds-background, text-ds-primary, rounded-ds-md,
 * shadow-ds-soft, p-ds-16, text-display, text-h1, etc.
 */
const config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
};

export default config;

/**
 * Token reference (source of truth: globals.css)
 */
export const designTokens = {
  colors: {
    background: "#0A0A0A",
    surface: "#111111",
    border: "#1F1F1F",
    primary: "#2563EB",
    success: "#10B981",
    warning: "#F59E0B",
    danger: "#EF4444",
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
} as const;
