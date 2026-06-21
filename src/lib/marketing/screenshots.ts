export const MARKETING_SCREENSHOTS = {
  dashboard: "/marketing/screenshots/dashboard.png",
  workforce: "/marketing/screenshots/workforce.png",
  operations: "/marketing/screenshots/operations.png",
  finance: "/marketing/screenshots/finance.png",
  portal: "/marketing/screenshots/portal.png",
  ai: "/marketing/screenshots/ai.png",
} as const;

export type MarketingScreenshotKey = keyof typeof MARKETING_SCREENSHOTS;
