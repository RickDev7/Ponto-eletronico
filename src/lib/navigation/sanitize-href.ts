import { ROUTES } from "@/config/constants";

const COMPANY_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** True when href is missing or contains invalid/placeholder path segments. */
export function isInvalidAppHref(href: string | null | undefined): boolean {
  if (!href || typeof href !== "string") return true;

  const trimmed = href.trim();
  if (!trimmed || trimmed.includes("undefined")) return true;

  const pathOnly = trimmed.split("?")[0]?.split("#")[0] ?? "";
  const segments = pathOnly.split("/").filter(Boolean);

  return segments.some(
    (segment) =>
      segment === "undefined" ||
      segment === "null" ||
      segment.includes("undefined"),
  );
}

/** Returns a safe in-app path or the provided fallback (defaults to home). */
export function sanitizeAppHref(
  href: string | null | undefined,
  fallback: string = ROUTES.home,
): string {
  if (isInvalidAppHref(href)) return fallback;

  const trimmed = href!.trim();
  if (!trimmed.startsWith("/")) return `/${trimmed}`;
  return trimmed;
}

/** Validates the first URL segment as a tenant company slug. */
export function isValidCompanySlug(slug: string): boolean {
  return COMPANY_SLUG_PATTERN.test(slug) && !slug.includes("undefined");
}
