"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { LogOut, Shield } from "lucide-react";
import { PLATFORM_NAV } from "@/config/platform-navigation";
import { ROUTES } from "@/config/constants";
import { AppShellLayout } from "@/components/design-system/layout/shell";
import { AppShellContent as AppShell } from "@/components/design-system/layout/app-shell-content";
import { cn } from "@/lib/utils";
import type { PlatformContext } from "@/types/platform";

interface PlatformShellProps {
  ctx: PlatformContext;
  children: React.ReactNode;
}

export function PlatformShell({ ctx, children }: PlatformShellProps) {
  const t = useTranslations("platform");
  const tNav = useTranslations("platform.nav");
  const pathname = usePathname();

  return (
    <AppShellLayout
      defaultSidebarCollapsed={false}
      sidebar={
        <aside className="flex h-full w-56 flex-col border-r border-border/60 bg-card">
          <div className="border-b border-border/60 px-4 py-4">
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-violet-600 text-white">
                <Shield className="size-4" />
              </div>
              <div>
                <p className="text-sm font-semibold">{t("brand")}</p>
                <p className="text-[10px] text-muted-foreground">{t("superAdmin")}</p>
              </div>
            </div>
          </div>
          <nav className="flex-1 space-y-0.5 p-2">
            {PLATFORM_NAV.map((item) => {
              const active =
                pathname === item.href ||
                (item.href !== ROUTES.superAdmin && pathname.startsWith(item.href));
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                    active
                      ? "bg-primary/10 font-medium text-primary"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  {tNav(item.titleKey)}
                </Link>
              );
            })}
          </nav>
          <div className="border-t border-border/60 p-3">
            <p className="truncate text-xs font-medium">{ctx.profile.full_name ?? "—"}</p>
            <Link
              href={ROUTES.login}
              className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground"
            >
              <LogOut className="size-3" />
              {t("exitPlatform")}
            </Link>
          </div>
        </aside>
      }
      header={
        <header className="flex h-12 items-center border-b border-border/60 px-4">
          <h1 className="text-sm font-semibold">
            {PLATFORM_NAV.find(
              (n) =>
                pathname === n.href ||
                (n.href !== ROUTES.superAdmin && pathname.startsWith(n.href)),
            )
              ? tNav(
                  PLATFORM_NAV.find(
                    (n) =>
                      pathname === n.href ||
                      (n.href !== ROUTES.superAdmin && pathname.startsWith(n.href)),
                  )!.titleKey,
                )
              : tNav("overview")}
          </h1>
        </header>
      }
    >
      <AppShell>{children}</AppShell>
    </AppShellLayout>
  );
}
