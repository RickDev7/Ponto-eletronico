/**
 * Design tokens live in src/app/globals.css (@theme inline).
 * TS reference: src/config/design-tokens.ts
 *
 * Utilities: bg-background, text-foreground, bg-card, border-border,
 * bg-ds-background, shadow-ds-soft, text-h1, p-ds-16, etc.
 */
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
};

export default config;

export { designTokens } from "./src/config/design-tokens";
