"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { LogOut, Search, Settings, UserCircle2, Palette } from "lucide-react";
import { toast } from "sonner";
import { signOut } from "@/actions/auth";
import { ROUTES } from "@/config/constants";
import { Link } from "@/i18n/navigation";
import { resolvePageHeader } from "@/config/navigation";
import { Button } from "@/components/ui/button";
import { ThemeSwitcherDropdown } from "@/components/theme";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { CommandPalette } from "@/components/search/command-palette";
import { NotificationBell } from "@/components/features/notifications/notification-bell";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Header, HeaderActions, HeaderCenter, HeaderLeading } from "@/components/design-system";
import { SidebarMobileTrigger } from "@/components/design-system/layout";
import type { CompanyContext } from "@/types/database";

interface AppHeaderProps {
  ctx: CompanyContext;
  userCompanies?: { id: string; name: string; slug: string }[];
}

export function AppHeader({ ctx }: AppHeaderProps) {
  const t = useTranslations("navigation");
  const tAuth = useTranslations("auth");
  const tErrors = useTranslations("errors");
  const pathname = usePathname();
  const router = useRouter();
  const [paletteOpen, setPaletteOpen] = useState(false);

  const { title, subtitle } = useMemo(
    () => resolvePageHeader(pathname, ctx.company.slug, t),
    [pathname, ctx.company.slug, t],
  );

  const initials = (ctx.profile.full_name ?? "?")
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  async function handleSignOut() {
    const id = toast.loading(tAuth("signingOut"));
    const result = await signOut();
    toast.dismiss(id);
    if (!result.success) {
      toast.error(tErrors("signOutFailed"));
      return;
    }
    router.push(ROUTES.login);
    router.refresh();
  }

  return (
    <>
      <Header className="h-16 w-full border-border bg-background px-4 lg:px-6">
        <HeaderLeading className="min-w-0 flex-1 items-center gap-3">
          <SidebarMobileTrigger className="size-8 lg:hidden" />
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold tracking-tight">{title}</h1>
            {subtitle && (
              <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
        </HeaderLeading>

        <HeaderCenter className="max-w-md px-4">
          <button
            type="button"
            suppressHydrationWarning
            onClick={() => setPaletteOpen(true)}
            className="flex h-9 w-full max-w-md items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
          >
            <Search className="size-4 shrink-0 opacity-50" />
            <span className="flex-1 truncate text-left text-sm">{t("search")}</span>
            <kbd className="hidden rounded border border-border px-1.5 font-mono text-[10px] text-muted-foreground md:inline">
              ⌘K
            </kbd>
          </button>
        </HeaderCenter>

        <HeaderActions className="gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="size-9 md:hidden"
            onClick={() => setPaletteOpen(true)}
            aria-label={t("search")}
          >
            <Search className="size-4" />
          </Button>
          <NotificationBell slug={ctx.company.slug} userId={ctx.profile.id} />
          <LanguageSwitcher />
          <ThemeSwitcherDropdown slug={ctx.company.slug} />
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex size-9 items-center justify-center rounded-lg transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <Avatar className="size-7">
                <AvatarFallback className="bg-primary text-[10px] text-primary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium">{ctx.profile.full_name}</p>
                <p className="text-xs text-muted-foreground">{ctx.company.name}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                render={
                  <Link href={`/${ctx.company.slug}/mobile`} className="flex items-center gap-2" />
                }
              >
                <UserCircle2 className="size-4" />
                {t("myTasks")}
              </DropdownMenuItem>
              <DropdownMenuItem
                render={
                  <Link href={`/${ctx.company.slug}/settings`} className="flex items-center gap-2" />
                }
              >
                <Settings className="size-4" />
                {t("settings")}
              </DropdownMenuItem>
              <DropdownMenuItem
                render={
                  <Link
                    href={`/${ctx.company.slug}/settings?tab=appearance`}
                    className="flex items-center gap-2"
                  />
                }
              >
                <Palette className="size-4" />
                {t("appearance")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={() => void handleSignOut()}>
                <LogOut className="size-4" />
                {t("logout")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </HeaderActions>
      </Header>

      <CommandPalette
        slug={ctx.company.slug}
        companyId={ctx.company.id}
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
      />
    </>
  );
}
