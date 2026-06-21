"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import {
  Building2,
  Check,
  ChevronsUpDown,
  Menu,
  X,
} from "lucide-react";
import { setActiveCompany } from "@/actions/company/actions";
import { ROUTES } from "@/config/constants";
import { cn } from "@/lib/utils";
import { hasMinRole } from "@/types/enums";
import { getDashboardNavEntries, isNavGroup } from "@/config/navigation";
import type { CompanyContext } from "@/types/database";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Company { id: string; name: string; slug: string }

interface MobileSidebarProps {
  ctx: CompanyContext;
  userCompanies?: Company[];
}

export function MobileSidebarTrigger({ onClick }: { onClick: () => void }) {
  const t = useTranslations("navigation");
  return (
    <button
      onClick={onClick}
      className="inline-flex size-8 items-center justify-center rounded-md hover:bg-muted transition-colors lg:hidden"
      aria-label={t("openMenu")}
    >
      <Menu className="size-4" />
    </button>
  );
}

export function MobileSidebar({ ctx, userCompanies = [] }: MobileSidebarProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("navigation");
  const tRoles = useTranslations("roles");
  const navEntries = getDashboardNavEntries(ctx.company.slug).filter((item) =>
    hasMinRole(ctx.membership.role, item.minRole),
  );

  const initials = (ctx.profile.full_name ?? "?")
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const otherCompanies = userCompanies.filter((c) => c.id !== ctx.company.id);

  function handleNav(href: string) {
    setOpen(false);
    router.push(href);
  }

  async function switchCompany(slug: string, companyId: string) {
    setOpen(false);
    await setActiveCompany(companyId);
    router.push(ROUTES.dashboard(slug));
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex size-8 items-center justify-center rounded-md hover:bg-muted transition-colors lg:hidden"
        aria-label={t("openMenu")}
      >
        <Menu className="size-4" />
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-72 p-0 flex flex-col">
          <SheetHeader className="sr-only">
            <SheetTitle>{t("menuTitle")}</SheetTitle>
          </SheetHeader>

          <div className="flex h-14 items-center border-b px-3">
            {otherCompanies.length > 0 ? (
              <DropdownMenu>
                <DropdownMenuTrigger className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted transition-colors focus-visible:outline-none">
                  <div className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground text-xs font-bold shrink-0">
                    {ctx.company.name[0].toUpperCase()}
                  </div>
                  <span className="flex-1 truncate text-sm font-semibold">
                    {ctx.company.name}
                  </span>
                  <ChevronsUpDown className="size-3.5 text-muted-foreground shrink-0" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  <DropdownMenuGroup>
                    <DropdownMenuLabel className="text-xs text-muted-foreground">
                      {t("switchCompany")}
                    </DropdownMenuLabel>
                    <DropdownMenuItem className="gap-2 font-medium">
                      <Check className="size-3.5" />
                      {ctx.company.name}
                    </DropdownMenuItem>
                    {otherCompanies.map((c) => (
                      <DropdownMenuItem
                        key={c.id}
                        onSelect={() => switchCompany(c.slug, c.id)}
                        className="gap-2"
                      >
                        <Building2 className="size-3.5 text-muted-foreground" />
                        {c.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={() => { setOpen(false); router.push(ROUTES.selectCompany); }}
                    className="gap-2 text-muted-foreground"
                  >
                    <Building2 className="size-3.5" />
                    {t("allWorkspaces")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-2.5 px-2">
                <div className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground text-xs font-bold">
                  {ctx.company.name[0].toUpperCase()}
                </div>
                <span className="font-semibold text-sm truncate">
                  {ctx.company.name}
                </span>
              </div>
            )}

            <button
              onClick={() => setOpen(false)}
              className="ml-auto inline-flex size-7 items-center justify-center rounded-md hover:bg-muted transition-colors"
              aria-label={t("closeMenu")}
            >
              <X className="size-4" />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
            {navEntries.flatMap((entry) => {
              if (isNavGroup(entry)) {
                return [
                  <p key={entry.basePath} className="px-2.5 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {t(entry.titleKey)}
                  </p>,
                  ...entry.children.map((child) => {
                    const isActive = pathname === child.path || pathname.startsWith(child.path);
                    return (
                      <button
                        key={child.path}
                        onClick={() => handleNav(child.path)}
                        className={cn(
                          "w-full flex items-center gap-2.5 rounded-md px-2.5 py-2 pl-5 text-sm transition-colors text-left",
                          isActive
                            ? "bg-primary/10 text-primary font-medium"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground",
                        )}
                      >
                        {t(child.titleKey)}
                      </button>
                    );
                  }),
                ];
              }

              const isActive =
                pathname === entry.path ||
                (entry.path !== `/${ctx.company.slug}` && pathname.startsWith(entry.path));

              return (
                <button
                  key={entry.path}
                  onClick={() => handleNav(entry.path)}
                  className={cn(
                    "w-full flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors text-left",
                    isActive
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <entry.icon className="size-4 shrink-0" />
                  {t(entry.titleKey)}
                </button>
              );
            })}
          </nav>

          <div className="border-t p-3">
            <div className="flex items-center gap-2.5 rounded-md p-2 bg-muted/50">
              <Avatar className="size-8">
                <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{ctx.profile.full_name}</p>
                <p className="text-xs text-muted-foreground">{ctx.company.name}</p>
              </div>
              <Badge variant="outline" className="text-xs shrink-0">
                {tRoles(ctx.membership.role)}
              </Badge>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
