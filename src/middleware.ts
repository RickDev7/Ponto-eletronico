import { type NextRequest, NextResponse } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { AUTH_PUBLIC_PATHS, ROUTES } from "@/config/constants";
import { routing, LOCALE_STORAGE_KEY } from "@/i18n/routing";
import { updateSession } from "@/lib/supabase/middleware";

const intlMiddleware = createIntlMiddleware(routing);

const PUBLIC_PATHS = new Set<string>([
  ...AUTH_PUBLIC_PATHS,
  ROUTES.authCallback,
]);

function isStaticAsset(pathname: string): boolean {
  return (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/icons/") ||
    pathname.startsWith("/images/") ||
    pathname === "/sw.js" ||
    pathname === "/manifest.webmanifest" ||
    pathname === "/favicon.ico" ||
    pathname === "/offline" ||
    /\.\w+$/.test(pathname)
  );
}

function stripLocale(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length > 0 && routing.locales.includes(segments[0] as never)) {
    const rest = segments.slice(1);
    return rest.length > 0 ? `/${rest.join("/")}` : "/";
  }
  return pathname;
}

function getLocaleFromPathname(pathname: string): string {
  const segment = pathname.split("/").filter(Boolean)[0];
  if (segment && routing.locales.includes(segment as never)) {
    return segment;
  }
  return routing.defaultLocale;
}

function isPublicPath(pathname: string): boolean {
  const bare = stripLocale(pathname);
  return (
    PUBLIC_PATHS.has(bare) ||
    bare.startsWith("/auth/") ||
    bare.startsWith("/invite/") ||
    bare === "/offline"
  );
}

function isProtectedPath(pathname: string): boolean {
  if (isStaticAsset(pathname)) return false;
  if (isPublicPath(pathname)) return false;
  return true;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isStaticAsset(pathname)) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/webhooks")) {
    return NextResponse.next();
  }

  const storedLocale = request.cookies.get(LOCALE_STORAGE_KEY)?.value;
  if (
    storedLocale &&
    routing.locales.includes(storedLocale as never) &&
    !pathname.startsWith(`/${storedLocale}`)
  ) {
    const segments = pathname.split("/").filter(Boolean);
    if (segments.length === 0 || !routing.locales.includes(segments[0] as never)) {
      const url = request.nextUrl.clone();
      url.pathname =
        pathname === "/" ? `/${storedLocale}` : `/${storedLocale}${pathname}`;
      return NextResponse.redirect(url);
    }
  }

  const intlResponse = intlMiddleware(request);
  const { supabaseResponse, user } = await updateSession(request);

  const mergeCookies = (target: NextResponse) => {
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      target.cookies.set(cookie.name, cookie.value);
    });
    if (user) {
      target.headers.set("x-user-id", user.id);
    }
    return target;
  };

  const locale = getLocaleFromPathname(pathname);
  const barePath = stripLocale(pathname);

  // /login, /register, etc. are always reachable — including for authenticated users
  // (sign out, switch account, explicit navigation).
  if (PUBLIC_PATHS.has(barePath)) {
    return mergeCookies(intlResponse);
  }

  if (!user && isProtectedPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}${ROUTES.login}`;
    url.searchParams.set("redirect", barePath === "/" ? "" : barePath);
    if (!url.searchParams.get("redirect")) {
      url.searchParams.delete("redirect");
    }
    return mergeCookies(NextResponse.redirect(url));
  }

  return mergeCookies(intlResponse);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|otf)$).*)",
  ],
};
