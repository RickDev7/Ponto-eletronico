import { type NextRequest, NextResponse } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import {
  AUTH_PUBLIC_PATHS,
  ROUTES,
  isSuperAdminPath,
  isTenantWorkspacePath,
  toCanonicalSuperAdminPath,
} from "@/config/constants";
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

async function checkPlatformAdmin(
  supabase: Awaited<ReturnType<typeof updateSession>>["supabase"],
  userId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("platform_admins")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[middleware] platform_admins check failed:", error.message);
    return false;
  }

  return Boolean(data);
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
  const { supabaseResponse, user, supabase } = await updateSession(request);

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

  // Legacy /platform and alias /admin → canonical /super-admin
  if (isSuperAdminPath(barePath) && barePath !== ROUTES.superAdmin && !barePath.startsWith(`${ROUTES.superAdmin}/`)) {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}${toCanonicalSuperAdminPath(barePath)}`;
    return mergeCookies(NextResponse.redirect(url));
  }

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

  if (user) {
    const isSuperAdmin = await checkPlatformAdmin(supabase, user.id);

    // Super Admin paths: allow only platform_admins; never fall through to tenant
    if (isSuperAdminPath(barePath)) {
      if (!isSuperAdmin) {
        const url = request.nextUrl.clone();
        url.pathname = `/${locale}${ROUTES.login}`;
        url.searchParams.set("error", "platform_access_denied");
        return mergeCookies(NextResponse.redirect(url));
      }
      return mergeCookies(intlResponse);
    }

    // Super Admin must never enter tenant workspace
    if (
      isSuperAdmin &&
      (isTenantWorkspacePath(barePath) ||
        barePath === ROUTES.selectCompany ||
        barePath === ROUTES.onboarding)
    ) {
      const url = request.nextUrl.clone();
      url.pathname = `/${locale}${ROUTES.superAdmin}`;
      return mergeCookies(NextResponse.redirect(url));
    }
  }

  return mergeCookies(intlResponse);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|otf)$).*)",
  ],
};
