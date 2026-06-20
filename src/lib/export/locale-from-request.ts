import { routing } from "@/i18n/routing";

export type ExportLocale = "pt" | "en";

/** Reads app locale from the first URL segment (/pt/... or /en/...). */
export function getExportLocaleFromRequest(request: Request): ExportLocale {
  const segment = new URL(request.url).pathname.split("/").filter(Boolean)[0];
  if (segment === "en") return "en";
  if (segment === "pt") return "pt";
  return routing.defaultLocale as ExportLocale;
}
